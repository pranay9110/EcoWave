cmake_minimum_required(VERSION 3.16)
project(SustainableTextileBackend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

find_path(MYSQL_INCLUDE_DIR
    NAMES mysql.h
    PATHS /usr/include /usr/local/include
    PATH_SUFFIXES mysql mariadb
    REQUIRED
)

find_library(MYSQL_LIBRARY
    NAMES mariadb mysqlclient
    PATHS /usr/lib /usr/lib/x86_64-linux-gnu /usr/local/lib
    REQUIRED
)

add_executable(textile_server
    src/main.cpp
    database/db.cpp
    routes/api_routes.cpp
    controllers/auth_controller.cpp
    controllers/dashboard_controller.cpp
    controllers/materials_controller.cpp
    controllers/production_controller.cpp
    controllers/machines_controller.cpp
    controllers/quality_controller.cpp
    controllers/inventory_controller.cpp
    controllers/sustainability_controller.cpp
    controllers/orders_controller.cpp
    controllers/reports_controller.cpp
)

target_include_directories(textile_server PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/models
    ${MYSQL_INCLUDE_DIR}
)

target_link_libraries(textile_server PRIVATE
    ${MYSQL_LIBRARY}
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
)
