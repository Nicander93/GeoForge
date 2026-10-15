// GDAL takes UTF-8 paths. On Windows argv arrives in the ANSI code page and
// std::ifstream takes ANSI too, so both go through UTF-16 here.
#pragma once

#include <fstream>
#include <string>
#include <vector>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <shellapi.h>

inline std::wstring utf8_to_wide(const std::string& text) {
    const int size = MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, nullptr, 0);
    std::wstring out(size > 0 ? size - 1 : 0, L'\0');
    if (size > 1) MultiByteToWideChar(CP_UTF8, 0, text.c_str(), -1, &out[0], size);
    return out;
}

inline std::string wide_to_utf8(const wchar_t* text) {
    const int size = WideCharToMultiByte(CP_UTF8, 0, text, -1, nullptr, 0, nullptr, nullptr);
    std::string out(size > 0 ? size - 1 : 0, '\0');
    if (size > 1) WideCharToMultiByte(CP_UTF8, 0, text, -1, &out[0], size, nullptr, nullptr);
    return out;
}

inline std::vector<std::string> utf8_arguments(int argc, char** argv) {
    int count = 0;
    wchar_t** wide = CommandLineToArgvW(GetCommandLineW(), &count);
    if (!wide) return std::vector<std::string>(argv, argv + argc);
    std::vector<std::string> out;
    for (int i = 0; i < count; ++i) out.push_back(wide_to_utf8(wide[i]));
    LocalFree(wide);
    return out;
}

inline std::ifstream open_utf8(const std::string& path, std::ios::openmode mode = std::ios::in) {
    return std::ifstream(utf8_to_wide(path).c_str(), mode);
}
#else
inline std::vector<std::string> utf8_arguments(int argc, char** argv) { return std::vector<std::string>(argv, argv + argc); }

inline std::ifstream open_utf8(const std::string& path, std::ios::openmode mode = std::ios::in) { return std::ifstream(path, mode); }
#endif
