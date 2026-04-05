## Renders the first-person EO-style corridor view.
##
## Layout (784 × 480 viewport):
##
##   D1 = immediately surrounding the player  (outer frame)
##   D2 = one tile ahead                      (middle ring)
##   D3 = two tiles ahead                     (inner ring, background shows through)
##
## Depth-tier boundaries (fraction of viewport):
##   D1: x [0.22 .. 0.78]   y [0.22 .. 0.78]
##   D2: x [0.36 .. 0.64]   y [0.32 .. 0.68]
##   D3: x [0.43 .. 0.57]   y [0.38 .. 0.62]

extends Node2D

const VIEW_W: float = 784.0
const VIEW_H: float = 480.0

## Pixel boundaries of each depth tier
const D1_X1: float = 0.22 * VIEW_W   # 172
const D1_X2: float = 0.78 * VIEW_W   # 612
const D1_Y1: float = 0.22 * VIEW_H   # 106
const D1_Y2: float = 0.78 * VIEW_H   # 374

const D2_X1: float = 0.36 * VIEW_W   # 282
const D2_X2: float = 0.64 * VIEW_W   # 502
const D2_Y1: float = 0.32 * VIEW_H   # 154
const D2_Y2: float = 0.68 * VIEW_H   # 326

const D3_X1: float = 0.43 * VIEW_W   # 337
const D3_X2: float = 0.57 * VIEW_W   # 447
const D3_Y1: float = 0.38 * VIEW_H   # 182
const D3_Y2: float = 0.62 * VIEW_H   # 298

@onready var bg:         Sprite2D = $Background
@onready var floor_spr:  Sprite2D = $Floor
@onready var d3_front:   Sprite2D = $D3WallFront
@onready var d3_left:    Sprite2D = $D3WallLeft
@onready var d3_right:   Sprite2D = $D3WallRight
@onready var d2_front:   Sprite2D = $D2WallFront
@onready var d2_left:    Sprite2D = $D2WallLeft
@onready var d2_right:   Sprite2D = $D2WallRight
@onready var d1_front:   Sprite2D = $D1WallFront
@onready var d1_left:    Sprite2D = $D1WallLeft
@onready var d1_right:   Sprite2D = $D1WallRight
@onready var flash:      ColorRect = $FlashRect


func _ready() -> void:
	_layout_sprites()
	# All walls hidden until first update_view call
	_set_all_walls(false)


# ── Public API ───────────────────────────────────────────────────────────────

func update_view(px: int, py: int, heading: int, map: DungeonMap) -> void:
	var fwd   := _hvec(heading)
	var right := _hvec((heading + 1) % 4)

	var open := func(fs: int, ss: int) -> bool:
		return map.is_passable(px + fwd.x * fs + right.x * ss,
		                       py + fwd.y * fs + right.y * ss)

	var f1: bool = open.call(1, 0)
	var f2: bool = f1 and open.call(2, 0)
	var f3: bool = f2 and open.call(3, 0)

	d1_left.visible  = not open.call(0, -1)
	d1_right.visible = not open.call(0,  1)
	d1_front.visible = not f1

	d2_left.visible  = f1 and not open.call(1, -1)
	d2_right.visible = f1 and not open.call(1,  1)
	d2_front.visible = f1 and not f2

	d3_left.visible  = f2 and not open.call(2, -1)
	d3_right.visible = f2 and not open.call(2,  1)
	d3_front.visible = f2 and not f3


## Flash white → update view → done
func play_step(on_midpoint: Callable) -> void:
	flash.color = Color(1.0, 1.0, 1.0, 0.30)
	var tw := create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.14)
	tw.tween_callback(on_midpoint)


## Flash black → update view → done
func play_turn(on_midpoint: Callable) -> void:
	flash.color = Color(0.0, 0.0, 0.0, 0.55)
	var tw := create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.12)
	tw.tween_callback(on_midpoint)


## Red pulse – wall bump
func play_bump() -> void:
	flash.color = Color(0.75, 0.10, 0.10, 0.35)
	var tw := create_tween()
	tw.tween_property(flash, "color:a", 0.0, 0.22)


# ── Layout ───────────────────────────────────────────────────────────────────

func _layout_sprites() -> void:
	# Background fills entire view
	_fit(bg, Vector2.ZERO, Vector2(VIEW_W, VIEW_H))

	# Floor covers the bottom 55% (perspective floor strip)
	_fit(floor_spr, Vector2(0, VIEW_H * 0.45), Vector2(VIEW_W, VIEW_H * 0.55))

	# D3 (farthest, drawn first / lowest)
	_fit(d3_front, Vector2(D3_X1, D3_Y1), Vector2(D3_X2 - D3_X1, D3_Y2 - D3_Y1))
	_fit(d3_left,  Vector2(D2_X1, D2_Y1), Vector2(D3_X1 - D2_X1, D2_Y2 - D2_Y1))
	_fit(d3_right, Vector2(D3_X2, D2_Y1), Vector2(D2_X2 - D3_X2, D2_Y2 - D2_Y1))

	# D2 (middle)
	_fit(d2_front, Vector2(D2_X1, D2_Y1), Vector2(D2_X2 - D2_X1, D2_Y2 - D2_Y1))
	_fit(d2_left,  Vector2(D1_X1, D1_Y1), Vector2(D2_X1 - D1_X1, D1_Y2 - D1_Y1))
	_fit(d2_right, Vector2(D2_X2, D1_Y1), Vector2(D1_X2 - D2_X2, D1_Y2 - D1_Y1))

	# D1 (nearest, drawn last / on top)
	_fit(d1_front, Vector2(D1_X1, D1_Y1), Vector2(D1_X2 - D1_X1, D1_Y2 - D1_Y1))
	_fit(d1_left,  Vector2(0.0,   0.0),   Vector2(D1_X1,          VIEW_H))
	_fit(d1_right, Vector2(D1_X2, 0.0),   Vector2(VIEW_W - D1_X2, VIEW_H))

	# Flash overlay (full view, drawn on top of everything)
	flash.position      = Vector2.ZERO
	flash.size          = Vector2(VIEW_W, VIEW_H)
	flash.color         = Color(0, 0, 0, 0)
	flash.mouse_filter  = Control.MOUSE_FILTER_IGNORE


func _fit(sprite: Sprite2D, pos: Vector2, display_size: Vector2) -> void:
	sprite.centered = false
	sprite.position = pos
	if sprite.texture != null:
		var tex_sz: Vector2 = sprite.texture.get_size()
		sprite.scale = display_size / tex_sz
	else:
		sprite.scale = Vector2.ONE


func _set_all_walls(visible_state: bool) -> void:
	for node in [d1_left, d1_right, d1_front,
	             d2_left, d2_right, d2_front,
	             d3_left, d3_right, d3_front]:
		node.visible = visible_state


# ── Utility ──────────────────────────────────────────────────────────────────

static func _hvec(heading: int) -> Vector2i:
	match heading:
		0: return Vector2i( 0, -1)  # North
		1: return Vector2i( 1,  0)  # East
		2: return Vector2i( 0,  1)  # South
		3: return Vector2i(-1,  0)  # West
	return Vector2i.ZERO
