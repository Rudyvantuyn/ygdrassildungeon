## Dungeon scene root: handles player movement, input, POI triggers, HUD.
extends Node2D

const HEADING_NAMES := ["N", "E", "S", "W"]

var _map:     DungeonMap
var _pos_x:   int = 1
var _pos_y:   int = 1
var _heading: int = 1   # 0=N 1=E 2=S 3=W
var _locked:  bool = false
var _log:     Array[String] = []

@onready var corridor:       CorridorRenderer = $CorridorView
@onready var minimap_draw:   MinimapDraw      = $RightPanel/MinimapDraw
@onready var compass_label:  Label            = $RightPanel/CompassLabel
@onready var log_label:      RichTextLabel    = $RightPanel/LogPanel/LogLabel
@onready var hp_bar_1:       ProgressBar      = $RightPanel/Party/Member0/HPBar
@onready var hp_bar_2:       ProgressBar      = $RightPanel/Party/Member1/HPBar
@onready var hp_label_1:     Label            = $RightPanel/Party/Member0/HPLabel
@onready var hp_label_2:     Label            = $RightPanel/Party/Member1/HPLabel
@onready var floor_label:    Label            = $RightPanel/FloorLabel


func _ready() -> void:
	_map = DungeonMap.new()
	_map.load_floor(GameManager.current_floor)
	_pos_x   = _map.start_x
	_pos_y   = _map.start_y
	_heading = _map.start_heading
	_push_log("Floor %d. Find the staircase." % GameManager.current_floor)
	_refresh()


func _unhandled_input(event: InputEvent) -> void:
	if _locked:
		return
	if event.is_action_pressed("move_forward"):
		_move_forward()
	elif event.is_action_pressed("turn_left"):
		_turn(-1)
	elif event.is_action_pressed("turn_right"):
		_turn(1)


# ── Movement ─────────────────────────────────────────────────────────────────

func _move_forward() -> void:
	var fwd := CorridorRenderer._hvec(_heading)
	var nx   := _pos_x + fwd.x
	var ny   := _pos_y + fwd.y

	if _map.is_passable(nx, ny):
		_locked = true
		corridor.play_step(func():
			_pos_x = nx
			_pos_y = ny
			corridor.update_view(_pos_x, _pos_y, _heading, _map)
			_refresh()
			_check_poi()
			_locked = false
		)
	else:
		corridor.play_bump()
		_push_log("A wall blocks the path.")
		_refresh_log()


func _turn(dir: int) -> void:
	_locked = true
	corridor.play_turn(func():
		_heading = (_heading + dir + 4) % 4
		corridor.update_view(_pos_x, _pos_y, _heading, _map)
		_refresh()
		_locked = false
	)


# ── POI ───────────────────────────────────────────────────────────────────────

func _check_poi() -> void:
	var poi := _map.get_poi(_pos_x, _pos_y)
	match poi:
		DungeonMap.POI.STAIRS_DOWN:
			_push_log("Staircase descends deeper…")
			_refresh()
			# Small delay then go to next floor
			await get_tree().create_timer(0.8).timeout
			GameManager.current_floor += 1
			GameManager.go_dungeon()

		DungeonMap.POI.TREASURE:
			_push_log("Treasure chest! +50 gold.")
			_refresh()

		DungeonMap.POI.ENCOUNTER:
			_push_log("Enemy contact!")
			_locked = true
			await get_tree().create_timer(0.4).timeout
			GameManager.go_combat([
				{"name": "Forest Sprite", "hp": 40, "max_hp": 40, "atk": 8, "def": 4, "spd": 10},
			])


# ── UI refresh ────────────────────────────────────────────────────────────────

func _refresh() -> void:
	corridor.update_view(_pos_x, _pos_y, _heading, _map)
	compass_label.text  = HEADING_NAMES[_heading]
	floor_label.text    = "Floor %d" % GameManager.current_floor
	_refresh_minimap()
	_refresh_party()
	_refresh_log()


func _refresh_party() -> void:
	var party := GameManager.party
	if party.size() > 0:
		var m0 := party[0]
		hp_bar_1.max_value = m0.max_hp
		hp_bar_1.value     = m0.hp
		hp_label_1.text    = "%s  %d/%d" % [m0.name, m0.hp, m0.max_hp]
	if party.size() > 1:
		var m1 := party[1]
		hp_bar_2.max_value = m1.max_hp
		hp_bar_2.value     = m1.hp
		hp_label_2.text    = "%s  %d/%d" % [m1.name, m1.hp, m1.max_hp]


func _refresh_log() -> void:
	log_label.text = "\n".join(_log.slice(-10))


func _refresh_minimap() -> void:
	(minimap_draw as MinimapDraw).set_state(_map, _pos_x, _pos_y, _heading)


func _push_log(line: String) -> void:
	_log.append(line)
	if _log.size() > 20:
		_log = _log.slice(-20)
