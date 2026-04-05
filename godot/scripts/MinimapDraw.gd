## Draws the mini-map. Attach to a Node2D inside the right panel.
extends Node2D

const CELL := 8   # pixels per map cell
const COLS  := Color(0.18, 0.18, 0.22)  # wall colour
const FLOOR_COL := Color(0.40, 0.38, 0.50)
const PLAYER_COL := Color(0.95, 0.82, 0.30)

var _map: DungeonMap
var _px: int = 0
var _py: int = 0
var _heading: int = 1


func set_state(map: DungeonMap, px: int, py: int, heading: int) -> void:
	_map    = map
	_px     = px
	_py     = py
	_heading = heading
	queue_redraw()


func _draw() -> void:
	if _map == null:
		return
	for y in _map.height:
		for x in _map.width:
			var rect := Rect2(x * CELL, y * CELL, CELL - 1, CELL - 1)
			var col: Color
			if _map.is_passable(x, y):
				col = FLOOR_COL
			else:
				col = COLS
			draw_rect(rect, col)

	# Draw player dot + direction indicator
	var px_f := float(_px) * CELL + CELL * 0.5
	var py_f := float(_py) * CELL + CELL * 0.5
	draw_circle(Vector2(px_f, py_f), 3.5, PLAYER_COL)
	var fwd := CorridorRenderer._hvec(_heading)
	var tip  := Vector2(px_f + fwd.x * 5.0, py_f + fwd.y * 5.0)
	draw_line(Vector2(px_f, py_f), tip, PLAYER_COL, 2.0)
