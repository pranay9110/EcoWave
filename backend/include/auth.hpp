#pragma once

#include <string>
#include <vector>
#include <optional>
#include <ctime>
#include <sstream>
#include <iomanip>
#include <openssl/evp.h>
#include <openssl/hmac.h>
#include <openssl/rand.h>
#include <openssl/crypto.h>

namespace textile::auth {

struct AuthUser {
    int user_id = 0;
    std::string full_name;
    std::string email;
    std::string role;
};

inline std::string to_hex(const unsigned char* data, size_t len) {
    std::ostringstream oss;
    for (size_t i = 0; i < len; ++i) {
        oss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(data[i]);
    }
    return oss.str();
}

inline std::string sha256_hex(const std::string& input) {
    unsigned char hash[EVP_MAX_MD_SIZE];
    unsigned int hash_len = 0;
    EVP_MD_CTX* ctx = EVP_MD_CTX_new();
    EVP_DigestInit_ex(ctx, EVP_sha256(), nullptr);
    EVP_DigestUpdate(ctx, input.data(), input.size());
    EVP_DigestFinal_ex(ctx, hash, &hash_len);
    EVP_MD_CTX_free(ctx);
    return to_hex(hash, hash_len);
}

inline std::string random_salt(size_t bytes = 12) {
    std::vector<unsigned char> buf(bytes);
    RAND_bytes(buf.data(), static_cast<int>(bytes));
    return to_hex(buf.data(), buf.size());
}

inline std::string hash_password(const std::string& password) {
    std::string salt = random_salt(12);
    std::string digest = sha256_hex(salt + ":" + password);
    return "sha256$" + salt + "$" + digest;
}

inline bool verify_password(const std::string& password, const std::string& stored) {
    const std::string prefix = "sha256$";
    if (stored.rfind(prefix, 0) != 0) return false;
    size_t pos1 = prefix.size();
    size_t pos2 = stored.find('$', pos1);
    if (pos2 == std::string::npos) return false;
    std::string salt = stored.substr(pos1, pos2 - pos1);
    std::string expected = stored.substr(pos2 + 1);
    std::string actual = sha256_hex(salt + ":" + password);
    if (expected.size() != actual.size()) return false;
    return CRYPTO_memcmp(expected.data(), actual.data(), expected.size()) == 0;
}

inline std::string base64url_encode(const std::string& in) {
    static const char tbl[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    std::string out;
    int val = 0, valb = -6;
    for (unsigned char c : in) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(tbl[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) out.push_back(tbl[((val << 8) >> (valb + 8)) & 0x3F]);
    for (char& ch : out) {
        if (ch == '+') ch = '-';
        else if (ch == '/') ch = '_';
    }
    return out;
}

inline std::string base64url_decode(std::string in) {
    for (char& ch : in) {
        if (ch == '-') ch = '+';
        else if (ch == '_') ch = '/';
    }
    while (in.size() % 4 != 0) in.push_back('=');
    std::vector<int> T(256, -1);
    static const char tbl[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    for (int i = 0; i < 64; i++) T[static_cast<unsigned char>(tbl[i])] = i;
    std::string out;
    int val = 0, valb = -8;
    for (unsigned char c : in) {
        if (T[c] == -1) break;
        val = (val << 6) + T[c];
        valb += 6;
        if (valb >= 0) {
            out.push_back(static_cast<char>((val >> valb) & 0xFF));
            valb -= 8;
        }
    }
    return out;
}

inline std::string hmac_sha256_raw(const std::string& key, const std::string& data) {
    unsigned char result[EVP_MAX_MD_SIZE];
    unsigned int len = 0;
    HMAC(EVP_sha256(),
         key.data(), static_cast<int>(key.size()),
         reinterpret_cast<const unsigned char*>(data.data()), data.size(),
         result, &len);
    return std::string(reinterpret_cast<const char*>(result), len);
}

inline std::string sanitize_field(std::string s) {
    for (char& c : s) {
        if (c == '|' || c == '\n' || c == '\r') c = ' ';
    }
    return s;
}

inline std::string create_token(const AuthUser& user, const std::string& secret, long ttl_seconds = 86400) {
    long exp = static_cast<long>(std::time(nullptr)) + ttl_seconds;
    std::ostringstream oss;
    oss << user.user_id << "|"
        << sanitize_field(user.email) << "|"
        << sanitize_field(user.full_name) << "|"
        << sanitize_field(user.role) << "|"
        << exp;
    std::string payload = base64url_encode(oss.str());
    std::string sig = base64url_encode(hmac_sha256_raw(secret, payload));
    return payload + "." + sig;
}

inline std::optional<AuthUser> verify_token(const std::string& auth_header, const std::string& secret) {
    std::string token = auth_header;
    const std::string bearer = "Bearer ";
    if (token.rfind(bearer, 0) == 0) {
        token = token.substr(bearer.size());
    }
    if (token.empty()) return std::nullopt;
    size_t dot = token.find('.');
    if (dot == std::string::npos) return std::nullopt;
    std::string payload_b64 = token.substr(0, dot);
    std::string sig_b64 = token.substr(dot + 1);
    std::string expected_sig = base64url_encode(hmac_sha256_raw(secret, payload_b64));
    if (sig_b64.size() != expected_sig.size()) return std::nullopt;
    if (CRYPTO_memcmp(sig_b64.data(), expected_sig.data(), expected_sig.size()) != 0) return std::nullopt;

    std::string raw = base64url_decode(payload_b64);
    std::vector<std::string> parts;
    std::stringstream ss(raw);
    std::string item;
    while (std::getline(ss, item, '|')) {
        parts.push_back(item);
    }
    if (parts.size() != 5) return std::nullopt;

    try {
        AuthUser u;
        u.user_id = std::stoi(parts[0]);
        u.email = parts[1];
        u.full_name = parts[2];
        u.role = parts[3];
        long exp = std::stol(parts[4]);
        if (std::time(nullptr) > exp) return std::nullopt;
        return u;
    } catch (...) {
        return std::nullopt;
    }
}

inline bool has_role(const AuthUser& user, const std::vector<std::string>& allowed) {
    for (const auto& r : allowed) {
        if (user.role == r) return true;
    }
    return false;
}

} // namespace textile::auth
