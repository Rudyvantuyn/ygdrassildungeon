## Global singleton – game state, party data, scene routing.
extends Node

signal scene_changed(scene_key: String)

enum Scene { DUNGEON, COMBAT }

var current_scene: Scene = Scene.DUNGEON
var current_floor: int = 1
var combat_enemies: Array[Dictionary] = []

var party: Array[Dictionary] = [
	{
		"name": "Lief",
		"class": "Guardian",
		"hp": 80, "max_hp": 80,
		"tp": 30, "max_tp": 30,
		"atk": 12, "def": 10, "spd": 8,
		"skills": ["Shield Bash", "Guard"],
	},
	{
		"name": "Ayla",
		"class": "Ranger",
		"hp": 60, "max_hp": 60,
		"tp": 50, "max_tp": 50,
		"atk": 16, "def": 6, "spd": 14,
		"skills": ["Arrow Shot", "Poison Dart"],
	},
]

# ── Scene routing ────────────────────────────────────────────────────────────

func go_dungeon() -> void:
	current_scene = Scene.DUNGEON
	get_tree().change_scene_to_file("res://scenes/dungeon/Dungeon.tscn")
	scene_changed.emit("dungeon")

func go_combat(enemies: Array[Dictionary]) -> void:
	combat_enemies = enemies.duplicate(true)
	current_scene = Scene.COMBAT
	get_tree().change_scene_to_file("res://scenes/combat/Combat.tscn")
	scene_changed.emit("combat")

# ── Party helpers ────────────────────────────────────────────────────────────

func is_party_alive() -> bool:
	return party.any(func(m): return m.hp > 0)

func apply_damage(member_index: int, amount: int) -> void:
	party[member_index].hp = max(0, party[member_index].hp - amount)

func heal_member(member_index: int, amount: int) -> void:
	var m = party[member_index]
	m.hp = min(m.max_hp, m.hp + amount)
