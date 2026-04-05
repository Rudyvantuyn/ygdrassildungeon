## Turn-based combat scene controller.
## Party (up to 2) vs one enemy group.
extends Node

enum Phase { PLAYER_INPUT, ENEMY_TURN, ANIMATING, RESULT }

var _phase:         Phase = Phase.PLAYER_INPUT
var _selected_act:  int   = 0   # action menu cursor
var _target_member: int   = 0   # which party member is acting this turn
var _turn_queue:    Array[Dictionary] = []
var _log:           Array[String] = []
var _enemies:       Array[Dictionary] = []

@onready var enemy_name_label:    Label          = $UI/EnemyPanel/EnemyName
@onready var enemy_hp_bar:        ProgressBar    = $UI/EnemyPanel/HPBar
@onready var enemy_hp_label:      Label          = $UI/EnemyPanel/HPLabel
@onready var enemy_portrait:      TextureRect    = $UI/EnemyPanel/Portrait
@onready var action_list:         ItemList       = $UI/ActionPanel/ActionList
@onready var combat_log:          RichTextLabel  = $UI/LogPanel/LogLabel
@onready var result_panel:        Panel          = $UI/ResultPanel
@onready var result_label:        Label          = $UI/ResultPanel/ResultLabel

const ACTIONS_GUARDIAN := ["Attack", "Shield Bash", "Guard", "Run"]
const ACTIONS_RANGER   := ["Attack", "Arrow Shot",  "Guard", "Run"]


func _ready() -> void:
	_enemies = GameManager.combat_enemies.duplicate(true)
	_build_turn_queue()
	_refresh_ui()
	_push_log("Battle start!")
	result_panel.hide()


func _unhandled_input(event: InputEvent) -> void:
	if _phase != Phase.PLAYER_INPUT:
		return
	if event.is_action_pressed("ui_up"):
		_selected_act = max(0, _selected_act - 1)
		action_list.select(_selected_act)
	elif event.is_action_pressed("ui_down"):
		_selected_act = min(action_list.item_count - 1, _selected_act + 1)
		action_list.select(_selected_act)
	elif event.is_action_pressed("ui_accept"):
		_execute_player_action(_selected_act)


# ── Turn queue ────────────────────────────────────────────────────────────────

func _build_turn_queue() -> void:
	_turn_queue.clear()
	for i in GameManager.party.size():
		_turn_queue.append({"type": "party", "index": i, "spd": GameManager.party[i].spd})
	for i in _enemies.size():
		_turn_queue.append({"type": "enemy", "index": i, "spd": _enemies[i].spd})
	_turn_queue.sort_custom(func(a, b): return a.spd > b.spd)
	_target_member = _next_party_index()


# ── Player action ─────────────────────────────────────────────────────────────

func _execute_player_action(action_index: int) -> void:
	_phase = Phase.ANIMATING
	var actor := GameManager.party[_target_member]
	var actions := ACTIONS_GUARDIAN if actor.class == "Guardian" else ACTIONS_RANGER
	var action_name: String = actions[action_index] if action_index < actions.size() else "Attack"

	match action_name:
		"Attack", "Arrow Shot":
			var dmg := max(1, actor.atk - _enemies[0].def + randi_range(-2, 2))
			_enemies[0].hp = max(0, _enemies[0].hp - dmg)
			_push_log("%s → %s for %d dmg." % [actor.name, _enemies[0].name, dmg])

		"Shield Bash":
			var dmg := max(1, actor.atk - _enemies[0].def)
			_enemies[0].hp = max(0, _enemies[0].hp - dmg)
			_push_log("%s Shield Bash! %d dmg + stun." % [actor.name, dmg])

		"Poison Dart":
			var dmg := max(1, int(actor.atk * 0.6))
			_enemies[0].hp = max(0, _enemies[0].hp - dmg)
			_push_log("%s Poison Dart! %d dmg." % [actor.name, dmg])

		"Guard":
			_push_log("%s takes a defensive stance." % actor.name)

		"Run":
			_push_log("The party retreats!")
			await get_tree().create_timer(0.6).timeout
			GameManager.go_dungeon()
			return

	_refresh_ui()
	await get_tree().create_timer(0.5).timeout

	if _enemies[0].hp <= 0:
		_end_combat(true)
		return

	await _enemy_turn()


# ── Enemy turn ────────────────────────────────────────────────────────────────

func _enemy_turn() -> void:
	_phase = Phase.ENEMY_TURN
	var enemy := _enemies[0]
	var target_index := randi() % GameManager.party.size()
	var target := GameManager.party[target_index]
	var dmg := max(1, enemy.atk - target.def + randi_range(-1, 2))
	GameManager.apply_damage(target_index, dmg)
	_push_log("%s attacks %s for %d dmg!" % [enemy.name, target.name, dmg])
	_refresh_ui()

	await get_tree().create_timer(0.5).timeout

	if not GameManager.is_party_alive():
		_end_combat(false)
		return

	_target_member = _next_party_index()
	_selected_act  = 0
	_refresh_action_list()
	_phase = Phase.PLAYER_INPUT


# ── End combat ────────────────────────────────────────────────────────────────

func _end_combat(victory: bool) -> void:
	_phase = Phase.RESULT
	result_panel.show()
	if victory:
		result_label.text = "Victory!\n\n+30 XP  +20 Gold"
		_push_log("Victory!")
	else:
		result_label.text = "Defeated…\n\nReturn to entrance."
		_push_log("Party was defeated.")
	_refresh_ui()
	await get_tree().create_timer(2.5).timeout
	GameManager.go_dungeon()


# ── UI ────────────────────────────────────────────────────────────────────────

func _refresh_ui() -> void:
	if _enemies.size() > 0:
		var e := _enemies[0]
		enemy_name_label.text  = e.name
		enemy_hp_bar.max_value = e.max_hp
		enemy_hp_bar.value     = e.hp
		enemy_hp_label.text    = "%d / %d" % [e.hp, e.max_hp]
	combat_log.text = "\n".join(_log.slice(-8))
	_refresh_action_list()


func _refresh_action_list() -> void:
	action_list.clear()
	if _target_member >= GameManager.party.size():
		return
	var actor := GameManager.party[_target_member]
	var actions := ACTIONS_GUARDIAN if actor.class == "Guardian" else ACTIONS_RANGER
	for a in actions:
		action_list.add_item(a)
	action_list.select(_selected_act)


func _push_log(line: String) -> void:
	_log.append(line)
	if _log.size() > 20:
		_log = _log.slice(-20)


func _next_party_index() -> int:
	for i in GameManager.party.size():
		if GameManager.party[i].hp > 0:
			return i
	return 0
