## Floor map: tile data, passability, and point-of-interest lookup.
class_name DungeonMap
extends RefCounted

enum Tile { WALL = 0, FLOOR = 1 }
enum POI  { NONE, STAIRS_DOWN, STAIRS_UP, TREASURE, ENCOUNTER }

var width: int  = 10
var height: int = 10
var tiles: Array[int] = []
var pois: Dictionary = {}      # "x,y" -> POI enum
var start_x: int = 1
var start_y: int = 1
var start_heading: int = 1     # 0=N 1=E 2=S 3=W


# ── Load floor 1 ─────────────────────────────────────────────────────────────

func load_floor(floor_number: int) -> void:
	match floor_number:
		1: _floor_1()
		_: _floor_1()

func _floor_1() -> void:
	width  = 10
	height = 10
	# 0=wall, 1=floor  (row-major, y=0 at top)
	tiles = [
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
		0, 1, 1, 1, 1, 0, 1, 1, 1, 0,
		0, 1, 0, 0, 1, 0, 1, 0, 1, 0,
		0, 1, 0, 1, 1, 1, 1, 0, 1, 0,
		0, 1, 0, 1, 0, 0, 0, 0, 1, 0,
		0, 1, 1, 1, 0, 1, 1, 1, 1, 0,
		0, 0, 0, 1, 0, 1, 0, 0, 0, 0,
		0, 1, 1, 1, 1, 1, 0, 1, 1, 0,
		0, 1, 0, 0, 0, 1, 1, 1, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	]
	start_x = 1
	start_y = 1
	start_heading = 1  # facing East

	pois = {
		"7,7": POI.STAIRS_DOWN,
		"3,3": POI.TREASURE,
		"6,1": POI.ENCOUNTER,
	}


# ── Queries ──────────────────────────────────────────────────────────────────

func is_passable(x: int, y: int) -> bool:
	if x < 0 or x >= width or y < 0 or y >= height:
		return false
	return tiles[y * width + x] == Tile.FLOOR

func get_poi(x: int, y: int) -> POI:
	return pois.get("%d,%d" % [x, y], POI.NONE)
