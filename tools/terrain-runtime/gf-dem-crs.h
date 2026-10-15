#pragma once
#include <string>
#include <vector>

int run_crs(int argc, char** argv);
bool points_to_raster(const std::string& pipeline, std::vector<double>& xs, std::vector<double>& ys, std::string& error);
