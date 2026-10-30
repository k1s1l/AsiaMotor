#!/usr/bin/env bash
# Prepares a car model for the web hero: removes duplicates and unused data, simplifies dense meshes,
# turns textures into 1024 px WebP and compresses geometry with meshopt. Node names are kept,
# so the assembly stages still match. Usage: npm run model:optimize -- source.glb [public/models/car.glb]
set -euo pipefail
src="${1:?usage: optimize-model.sh source.glb [out.glb]}"
out="${2:-public/models/car.glb}"
tmp="$(mktemp -d)"
gt="npx --yes @gltf-transform/cli@4"
$gt dedup "$src" "$tmp/1.glb"
$gt prune "$tmp/1.glb" "$tmp/2.glb"
$gt weld "$tmp/2.glb" "$tmp/3.glb"
$gt simplify "$tmp/3.glb" "$tmp/4.glb" --ratio 0.5 --error 0.001
$gt resize "$tmp/4.glb" "$tmp/5.glb" --width 1024 --height 1024
$gt webp "$tmp/5.glb" "$tmp/6.glb"
$gt meshopt "$tmp/6.glb" "$out"
rm -rf "$tmp"
ls -lh "$out"
