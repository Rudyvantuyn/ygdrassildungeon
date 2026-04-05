## Bootstrapper – immediately loads the dungeon scene.
extends Node

func _ready() -> void:
	GameManager.go_dungeon()
