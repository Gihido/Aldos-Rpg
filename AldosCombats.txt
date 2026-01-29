# main.py — ПОЛНАЯ СИСТЕМА С БАЗОЙ ДАННЫХ, СОХРАНЕНИЕМ ПЕРСОНАЖЕЙ, БЛОКИРОВКОЙ ИГРОКОВ И ДИНАМИЧЕСКИМ ОБНОВЛЕНИЕМ ИНТЕРФЕЙСА
import tkinter as tk
from tkinter import ttk, messagebox, colorchooser
import json
import os
import time
import random
import math
import hashlib
from tkinter import ttk
from datetime import datetime

# ============== КОНФИГУРАЦИЯ ==============
CONFIG_FILE = "config.json"
PLAYERS_DB_FILE = "data/players_db.json"
DEFAULT_CONFIG = {
    "locations": {
        "Главная": {
            "title": "📍 Главная локация",
            "bg_color": "#FFFFFF",
            "fg_color": "#000000",
            "monsters": None,
            "loot_pile": {
                "x": 20,
                "y": 350,
                "width": 200,
                "height": 120,
                "visible": True,
                "bg_color": "#8B4513",
                "fg_color": "#FFFFFF",
                "items": []
            },
            "btn_forest": {
                "text": "🌲 Перелесок", "font_family": "Arial", "font_size": 12,
                "bold": True, "bg": "#4CAF50", "fg": "#FFFFFF",
                "x": 200, "y": 150, "width": 200, "height": 50,
                "is_transition": True, "target_location": "Перелесок"
            },
            "btn_chest": {
                "text": "🎒 Сундук", "font_family": "Arial", "font_size": 12,
                "bold": True, "bg": "#FF9800", "fg": "#FFFFFF",
                "x": 200, "y": 220, "width": 200, "height": 50,
                "is_transition": False, "target_location": None
            }
        },
        "Перелесок": {
            "title": "🌿 Перелесок",
            "bg_color": "#F5F5F5",
            "fg_color": "#000000",
            "monster": {
                "name": "Волк",
                "hp": 10, "hp_max": 10,
                "mp": 5, "mp_max": 5,
                "min_dmg": 2, "max_dmg": 4,
                "icon": "🐺",
                "x": 420, "y": 120,
                "respawn_time": 15
            },
            "monster_bg_color": "#FFFFFF",
            "monster_fg_color": "#000000",
            "loot_pile": {
                "x": 20,
                "y": 350,
                "width": 200,
                "height": 120,
                "visible": True,
                "bg_color": "#8B4513",
                "fg_color": "#FFFFFF",
                "items": []
            },
            "btn_ruins": {
                "text": "🏚️ Развалины", "font_family": "Arial", "font_size": 12,
                "bold": True, "bg": "#9E9E9E", "fg": "#FFFFFF",
                "x": 100, "y": 150, "width": 180, "height": 50,
                "is_transition": True, "target_location": "Развалины"
            },
            "btn_cave": {
                "text": "🕳️ Пещера", "font_family": "Arial", "font_size": 12,
                "bold": True, "bg": "#607D8B", "fg": "#FFFFFF",
                "x": 320, "y": 150, "width": 180, "height": 50,
                "is_transition": True, "target_location": "Пещера"
            }
        },
        "Развалины": {
            "title": "🏚️ Развалины", 
            "bg_color": "#ECEFF1", 
            "fg_color": "#000000", 
            "monster": None,
            "loot_pile": {
                "x": 20,
                "y": 350,
                "width": 200,
                "height": 120,
                "visible": True,
                "bg_color": "#8B4513",
                "fg_color": "#FFFFFF",
                "items": []
            }
        },
        "Пещера": {
            "title": "🕳️ Пещера", 
            "bg_color": "#CFD8DC", 
            "fg_color": "#000000", 
            "monster": None,
            "loot_pile": {
                "x": 20,
                "y": 350,
                "width": 200,
                "height": 120,
                "visible": True,
                "bg_color": "#8B4513",
                "fg_color": "#FFFFFF",
                "items": []
            }
        }
    },
    "window": {
        "title": "Aldos RPG",
        "width": 600,
        "height": 450,
        "bg": "#FFFFFF"
    }
}

# ============== УТИЛИТЫ ==============
def safe_load_json(path, default_data):
    if not os.path.exists(path):
        return default_data
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Ошибка чтения {path}: {e}")
        return default_data

def safe_save_json(path, data):
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"⚠️ Ошибка сохранения {path}: {e}")

def load_config():
    return safe_load_json(CONFIG_FILE, DEFAULT_CONFIG)

def save_config(cfg):
    safe_save_json(CONFIG_FILE, cfg)

def hash_password(password):
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

# ============== БАЗА ДАННЫХ ИГРОКОВ ==============
class PlayersDB:
    def __init__(self):
        self.db_path = PLAYERS_DB_FILE
        self.players = self.load_all_players()
    
    def load_all_players(self):
        """Загрузить всех игроков из базы данных"""
        return safe_load_json(self.db_path, {
            "players": {},
            "metadata": {
                "created": datetime.now().isoformat(),
                "last_update": datetime.now().isoformat()
            }
        })
    
    def save_all_players(self):
        """Сохранить всех игроков в базу данных"""
        data = {
            "players": self.players["players"],
            "metadata": {
                "created": self.players["metadata"].get("created", datetime.now().isoformat()),
                "last_update": datetime.now().isoformat(),
                "total_players": len(self.players["players"])
            }
        }
        safe_save_json(self.db_path, data)
    
    def player_exists(self, username):
        """Проверить, существует ли игрок"""
        return username in self.players["players"]
    
    def register_player(self, username, player_data):
        """Зарегистрировать нового игрока"""
        if self.player_exists(username):
            return False
        
        # Добавляем метаданные игрока
        player_data["metadata"] = {
            "created": datetime.now().isoformat(),
            "last_login": datetime.now().isoformat(),
            "is_banned": False,
            "ban_reason": "",
            "is_admin": username.lower() == "admin" or username.lower() == "gihido"
        }
        
        # ДОБАВЬТЕ НАЧАЛЬНЫЕ ЗНАЧЕНИЯ УРОВНЯ И ОПЫТА
        if "level" not in player_data:
            player_data["level"] = 1
        if "experience" not in player_data:
            player_data["experience"] = 0
        
        self.players["players"][username] = player_data
        self.save_all_players()
        return True
    
    def get_player(self, username):
        """Получить данные игрока"""
        if self.player_exists(username):
            return self.players["players"][username]
        return None
    
    def update_player(self, username, player_data):
        """Обновить данные игрока"""
        if self.player_exists(username):
            # Сохраняем метаданные
            if "metadata" in self.players["players"][username]:
                player_data["metadata"] = self.players["players"][username]["metadata"]
                player_data["metadata"]["last_login"] = datetime.now().isoformat()
            else:
                player_data["metadata"] = {
                    "created": datetime.now().isoformat(),
                    "last_login": datetime.now().isoformat(),
                    "is_banned": False,
                    "ban_reason": "",
                    "is_admin": username.lower() == "admin" or username.lower() == "gihido"
                }
            
            self.players["players"][username] = player_data
            self.save_all_players()
            return True
        return False
    
    def ban_player(self, username, reason="Нарушение правил"):
        """Заблокировать игрока"""
        if self.player_exists(username):
            if "metadata" not in self.players["players"][username]:
                self.players["players"][username]["metadata"] = {}
            
            self.players["players"][username]["metadata"]["is_banned"] = True
            self.players["players"][username]["metadata"]["ban_reason"] = reason
            self.save_all_players()
            return True
        return False
    
    def unban_player(self, username):
        """Разблокировать игрока"""
        if self.player_exists(username):
            if "metadata" not in self.players["players"][username]:
                self.players["players"][username]["metadata"] = {}
            
            self.players["players"][username]["metadata"]["is_banned"] = False
            self.players["players"][username]["metadata"]["ban_reason"] = ""
            self.save_all_players()
            return True
        return False
    
    def is_banned(self, username):
        """Проверить, заблокирован ли игрок"""
        if self.player_exists(username):
            if "metadata" in self.players["players"][username]:
                return self.players["players"][username]["metadata"].get("is_banned", False)
        return False
    
    def get_ban_reason(self, username):
        """Получить причину блокировки"""
        if self.player_exists(username):
            if "metadata" in self.players["players"][username]:
                return self.players["players"][username]["metadata"].get("ban_reason", "")
        return ""
    
    def is_admin(self, username):
        """Проверить, является ли игрок администратором"""
        if self.player_exists(username):
            if "metadata" in self.players["players"][username]:
                return self.players["players"][username]["metadata"].get("is_admin", False)
        return username.lower() == "admin" or username.lower() == "gihido"
    
    def delete_player(self, username):
        """Удалить игрока из базы данных"""
        if self.player_exists(username):
            del self.players["players"][username]
            self.save_all_players()
            return True
        return False
    
    def get_all_players(self):
        """Получить список всех игроков"""
        return list(self.players["players"].keys())
    
    def get_player_stats(self, username):
        """Получить статистику игрока"""
        if not self.player_exists(username):
            return None
        
        player = self.players["players"][username]
        stats = {
            "username": username,
            "level": player.get("level", 1),
            "class": player.get("class", "Воин"),
            "gender": player.get("gender", "Мужчина"),
            "created": player.get("metadata", {}).get("created", "Неизвестно"),
            "last_login": player.get("metadata", {}).get("last_login", "Неизвестно"),
            "is_banned": player.get("metadata", {}).get("is_banned", False),
            "ban_reason": player.get("metadata", {}).get("ban_reason", ""),
            "is_admin": player.get("metadata", {}).get("is_admin", False)
        }
        return stats

    
class Monster:
    def __init__(self, id=None, name="Монстр", hp=10, hp_max=10, mp=0, mp_max=0,
                 min_dmg=1, max_dmg=3, icon="👹", x=400, y=100, respawn_time=15,
                 frame_width=120, frame_height=90):
        # Генерируем ID если не указан
        self.id = id or self.generate_id(name)
        self.name = name
        self.hp = hp
        self.hp_max = hp_max
        self.mp = mp
        self.mp_max = mp_max
        self.min_dmg = min_dmg
        self.max_dmg = max_dmg
        self.icon = icon
        self.x = x
        self.y = y
        self.is_alive = True
        self.respawn_time = None
        self.respawn_timer_id = None
        self.default_respawn_time = respawn_time
        self.stunned_turns = 0
        self.defense_active = False
        self.loot_table = []
        self.max_loot_items = 5
        self.player_loot_piles = {}
        self.frame_width = frame_width
        self.frame_height = frame_height
        
        self.exp_reward = self.calculate_default_exp()
    
    def generate_id(self, name=None):
        """Генерирует уникальный ID для монстра"""
        name = name or self.name
        timestamp = int(time.time() * 1000)
        random_suffix = random.randint(1000, 9999)
        clean_name = ''.join(c for c in name if c.isalnum()).lower()
        if not clean_name:
            clean_name = "monster"
        return f"{clean_name}_{timestamp}_{random_suffix}"
    
    def calculate_default_exp(self):
        """Рассчитать опыт по умолчанию на основе характеристик монстра"""
        return (self.hp_max // 2) + (self.max_dmg * 2)

    def take_damage(self, dmg):
        self.hp -= dmg
        if self.hp <= 0:
            self.hp = 0
            self.is_alive = False
            self.respawn_time = time.time() + self.default_respawn_time
            print(f"⚰️ Монстр {self.name} убит! Установлен таймер возрождения на {self.respawn_time}")
        return self.is_alive

    def attack(self):
        return random.randint(self.min_dmg, self.max_dmg)
    
    def add_loot_item(self, loot_item):
        """Добавить предмет в таблицу лута"""
        if len(self.loot_table) < self.max_loot_items:
            self.loot_table.append(loot_item)
            return True
        return False
    
    def remove_loot_item(self, index):
        """Удалить предмет из таблицы лута"""
        if 0 <= index < len(self.loot_table):
            return self.loot_table.pop(index)
        return None
    
    def generate_loot(self):
        """Генерирует лут на основе таблицы выпадения"""
        dropped_items = []
        
        for loot_item in self.loot_table:
            # Проверяем шанс выпадения
            if random.randint(1, 100) <= loot_item.drop_chance:
                item_data = loot_item.generate()
                dropped_items.append(item_data)
                
        return dropped_items

    def to_dict(self):
        return {
            "id": self.id,  # Добавляем сохранение ID
            "name": self.name,
            "hp": self.hp, "hp_max": self.hp_max,
            "mp": self.mp, "mp_max": self.mp_max,
            "min_dmg": self.min_dmg, "max_dmg": self.max_dmg,
            "icon": self.icon,
            "x": self.x, "y": self.y,
            "is_alive": self.is_alive,
            "respawn_time": self.respawn_time,  # Важно: сохраняем время возрождения
            "default_respawn_time": self.default_respawn_time,
            "stunned_turns": self.stunned_turns,
            "defense_active": self.defense_active,
            "loot_table": [item.to_dict() for item in self.loot_table],
            "max_loot_items": self.max_loot_items,
            "exp_reward": self.exp_reward,
            "frame_width": self.frame_width,
            "frame_height": self.frame_height
        }
    @classmethod
    def from_dict(cls, data):
        if not isinstance(data, dict):
            print(f"⚠️ Некорректные данные для монстра: {data}")
            return None
        
        # ДЕТАЛЬНАЯ ОТЛАДКА
        print(f"📥 Monster.from_dict() получает данные:")
        print(f"   name: {data.get('name')}")
        print(f"   id: {data.get('id')}")
        print(f"   respawn_time в данных: {data.get('respawn_time')}")
        print(f"   Все ключи в данных: {list(data.keys())}")
        
        respawn_time = data.get("default_respawn_time", 15)
        frame_width = data.get("frame_width", 120)
        frame_height = data.get("frame_height", 90)
        
        # Создаем объект монстра
        m = cls(
            id=data.get("id"),
            name=data.get("name", "Монстр"),
            hp=data.get("hp", 10),
            hp_max=data.get("hp_max", 10),
            mp=data.get("mp", 0),
            mp_max=data.get("mp_max", 0),
            min_dmg=data.get("min_dmg", 1),
            max_dmg=data.get("max_dmg", 3),
            icon=data.get("icon", "👹"),
            x=data.get("x", 400),
            y=data.get("y", 100),
            respawn_time=respawn_time,
            frame_width=frame_width,
            frame_height=frame_height
        )

        # ВАЖНО: Копируем ВСЕ атрибуты из данных
        for k, v in data.items():
            if hasattr(m, k) and v is not None:  # Не копируем None значения
                print(f"   Копируем атрибут '{k}': {v}")
                setattr(m, k, v)
        
        # ОСОБО ВАЖНО: явно устанавливаем respawn_time если он есть в данных
        if 'respawn_time' in data:
            m.respawn_time = data['respawn_time']
            print(f"   ✅ Явно установлен respawn_time: {m.respawn_time}")
        
        # Устанавливаем is_alive
        if 'is_alive' not in data:
            m.is_alive = m.hp > 0
        
        # Загружаем таблицу лута
        m.loot_table = []
        loot_data = data.get("loot_table", [])
        for loot_item_data in loot_data:
            loot_item = LootItem.from_dict(loot_item_data)
            if loot_item:
                m.loot_table.append(loot_item)
        
        m.max_loot_items = data.get("max_loot_items", 5)
        
        # Устанавливаем опыт
        if 'exp_reward' in data:
            m.exp_reward = data.get("exp_reward")
        else:
            m.exp_reward = m.calculate_default_exp()
        
        print(f"📖 Загружен монстр {m.name} (ID: {m.id}):")
        print(f"   HP={m.hp}/{m.hp_max}, alive={m.is_alive}")
        print(f"   respawn_time в объекте: {m.respawn_time}")
        return m
    @staticmethod
    def load_static_items():
        """Статический метод для загрузки предметов из других классов"""
        return safe_load_json("data/items.json", {})


# ============== КЛАСС УМЕНИЙ ==============
class Ability:
    def __init__(self, id, name, description, icon, class_requirement, cooldown, mana_cost, effect_type, value=None):
        self.id = id
        self.name = name
        self.description = description
        self.icon = icon
        self.class_requirement = class_requirement
        self.cooldown = cooldown  # В ходах
        self.mana_cost = mana_cost
        self.effect_type = effect_type  # "damage", "defense", "stun"
        self.value = value
        self.current_cooldown = 0
        self.is_equipped = False
        
    def can_use(self, player_mp, player_class):
        """Проверяет, можно ли использовать умение"""
        if player_class != self.class_requirement:
            return False
        if player_mp < self.mana_cost:
            return False
        if self.current_cooldown > 0:
            return False
        return True
    
    def use(self):
        """Использование умения"""
        self.current_cooldown = self.cooldown
        
    def update_cooldown(self):
        """Обновление перезарядки"""
        if self.current_cooldown > 0:
            self.current_cooldown -= 1

# ============== КЛАСС ГЕНЕРИРУЕМОГО ЛУТА ==============
class LootItem:
    def __init__(self, base_item_id, name_prefix="", damage_range=(1, 10), defense_range=(1, 5), 
                 weight_range=(1.0, 3.0), drop_chance=10, rarity="Обычный", 
                 min_damage_range=None, max_damage_range=None, min_defense_range=None, 
                 max_defense_range=None, consumable_effect_range=None, effect_type="heal"):
        self.base_item_id = base_item_id
        self.name_prefix = name_prefix
        self.damage_range = damage_range
        self.defense_range = defense_range
        self.weight_range = weight_range
        self.drop_chance = drop_chance
        self.rarity = rarity
        self.effect_type = effect_type  # "heal", "mana", "damage", "buff"
        
        # Новые поля для индивидуальных диапазонов
        self.min_damage_range = min_damage_range if min_damage_range is not None else damage_range[0]
        self.max_damage_range = max_damage_range if max_damage_range is not None else damage_range[1]
        self.min_defense_range = min_defense_range if min_defense_range is not None else defense_range[0]
        self.max_defense_range = max_defense_range if max_defense_range is not None else defense_range[1]
        
        # Диапазон для расходников
        self.consumable_effect_range = consumable_effect_range if consumable_effect_range is not None else (10, 30)
        
    def generate(self):
        """Генерирует конкретный экземпляр предмета"""
        items = RPGApp.load_static_items()
        base_item = items.get(self.base_item_id, {})
        
        # Генерация уникального ID
        timestamp = int(time.time() * 1000)
        random_suffix = random.randint(1000, 9999)
        generated_id = f"{self.base_item_id}_loot_{timestamp}_{random_suffix}"
        
        # Генерация статистик в пределах диапазона
        generated_stats = {
            "id": generated_id,
            "base_item_id": self.base_item_id,
            "name": f"{self.name_prefix} {base_item.get('name', 'Предмет')}",
            "type": base_item.get("type", "unknown"),
            "subtype": base_item.get("subtype", ""),
            "icon": base_item.get("icon", "📦"),
            "weight": round(random.uniform(self.weight_range[0], self.weight_range[1]), 1),
            "class_requirement": base_item.get("class_requirement", ""),
            "rarity": self.rarity
        }
        
        # Генерация урона или защиты в зависимости от типа
        if base_item.get("type") == "weapon":
            # Используем индивидуальный диапазон если задан, иначе общий
            min_dmg = self.min_damage_range if hasattr(self, 'min_damage_range') else self.damage_range[0]
            max_dmg = self.max_damage_range if hasattr(self, 'max_damage_range') else self.damage_range[1]
            generated_stats["damage"] = random.randint(min_dmg, max_dmg)
        elif base_item.get("type") == "armor":
            # Используем индивидуальный диапазон если задан, иначе общий
            min_def = self.min_defense_range if hasattr(self, 'min_defense_range') else self.defense_range[0]
            max_def = self.max_defense_range if hasattr(self, 'max_defense_range') else self.defense_range[1]
            generated_stats["defense"] = random.randint(min_def, max_def)
        elif base_item.get("type") == "consumable":
            generated_stats["effect"] = self.effect_type
            # Генерируем значение эффекта в заданном диапазоне
            min_eff = self.consumable_effect_range[0]
            max_eff = self.consumable_effect_range[1]
            generated_stats["value"] = random.randint(min_eff, max_eff)
        
        if "level_requirement" in base_item:
            generated_stats["level_requirement"] = base_item["level_requirement"]
        
        return generated_stats
    
    def to_dict(self):
        """Для сохранения в конфиг"""
        data = {
            "base_item_id": self.base_item_id,
            "name_prefix": self.name_prefix,
            "damage_range": self.damage_range,
            "defense_range": self.defense_range,
            "weight_range": self.weight_range,
            "drop_chance": self.drop_chance,
            "rarity": self.rarity,
            "effect_type": self.effect_type,
            "consumable_effect_range": self.consumable_effect_range
        }
        
        # Добавляем индивидуальные диапазоны если они отличаются от общих
        if hasattr(self, 'min_damage_range') and self.min_damage_range != self.damage_range[0]:
            data["min_damage_range"] = self.min_damage_range
        if hasattr(self, 'max_damage_range') and self.max_damage_range != self.damage_range[1]:
            data["max_damage_range"] = self.max_damage_range
        if hasattr(self, 'min_defense_range') and self.min_defense_range != self.defense_range[0]:
            data["min_defense_range"] = self.min_defense_range
        if hasattr(self, 'max_defense_range') and self.max_defense_range != self.defense_range[1]:
            data["max_defense_range"] = self.max_defense_range
            
        return data
    
    @classmethod
    def from_dict(cls, data):
        """Загрузка из конфига"""
        loot_item = cls(
            base_item_id=data.get("base_item_id"),
            name_prefix=data.get("name_prefix", ""),
            damage_range=tuple(data.get("damage_range", (1, 10))),
            defense_range=tuple(data.get("defense_range", (1, 5))),
            weight_range=tuple(data.get("weight_range", (1.0, 3.0))),
            drop_chance=data.get("drop_chance", 10),
            rarity=data.get("rarity", "Обычный"),
            effect_type=data.get("effect_type", "heal"),
            consumable_effect_range=tuple(data.get("consumable_effect_range", (10, 30)))
        )
        
        # Загружаем индивидуальные диапазоны если есть
        if "min_damage_range" in data:
            loot_item.min_damage_range = data["min_damage_range"]
        if "max_damage_range" in data:
            loot_item.max_damage_range = data["max_damage_range"]
        if "min_defense_range" in data:
            loot_item.min_defense_range = data["min_defense_range"]
        if "max_defense_range" in data:
            loot_item.max_defense_range = data["max_defense_range"]
            
        return loot_item

# =============================== КЛАСС УВЕДОМЛЕНИЙ ============================== #
# =============================== КЛАСС УВЕДОМЛЕНИЙ ============================== #
# =============================== КЛАСС УВЕДОМЛЕНИЙ ============================== #
class GameNotification:
    """Класс для стилизованных уведомлений игры"""
    
    def __init__(self, root):
        self.root = root
        self.notification_frame = None
        self.notification_timer = None
        self.battle_result_callback = None
        self.expanded_items = {}  # Для отслеживания раскрытых предметов
    
    def show_notification(self, message, notification_type="info", duration=3000):
        """Показать стилизованное уведомление"""
        # Удаляем старое уведомление если есть
        if self.notification_frame and self.notification_frame.winfo_exists():
            self.close_notification()
        
        # Определяем стиль в зависимости от типа
        styles = {
            "info": {"bg": "#2196F3", "icon": "ℹ️", "border": "#1976D2"},
            "success": {"bg": "#4CAF50", "icon": "✅", "border": "#388E3C"},
            "warning": {"bg": "#FF9800", "icon": "⚠️", "border": "#F57C00"},
            "error": {"bg": "#f44336", "icon": "❌", "border": "#D32F2F"},
            "victory": {"bg": "#9C27B0", "icon": "🎉", "border": "#7B1FA2"},
            "loot": {"bg": "#FF9800", "icon": "📦", "border": "#F57C00"},
            "level": {"bg": "#7B1FA2", "icon": "⭐", "border": "#6A1B9A"}
        }
        
        style = styles.get(notification_type, styles["info"])
        
        # Создаем фрейм уведомления
        self.notification_frame = tk.Frame(self.root, bg=style["border"], relief="raised", bd=2)
        self.notification_frame.place(x=10, y=70, width=300, height=60)
        
        # Запрещаем закрытие по клику на само уведомление
        self.notification_frame.bind("<Button-1>", lambda e: "break")
        
        # Внутренний фрейм
        inner_frame = tk.Frame(self.notification_frame, bg=style["bg"])
        inner_frame.pack(fill="both", expand=True, padx=2, pady=2)
        inner_frame.bind("<Button-1>", lambda e: "break")
        
        # Иконка и текст
        icon_label = tk.Label(inner_frame, text=style["icon"], font=("Arial", 18),
                             bg=style["bg"], fg="white")
        icon_label.pack(side="left", padx=(10, 5), pady=10)
        icon_label.bind("<Button-1>", lambda e: "break")
        
        message_label = tk.Label(inner_frame, text=message, font=("Arial", 10),
                                bg=style["bg"], fg="white", wraplength=220, justify="left")
        message_label.pack(side="left", padx=(0, 10), pady=10, fill="both", expand=True)
        message_label.bind("<Button-1>", lambda e: "break")
        
        # Кнопка закрытия (только для долгих уведомлений)
        if duration >= 5000:
            close_btn = tk.Button(inner_frame, text="×", font=("Arial", 12, "bold"),
                                 bg=style["border"], fg="white", width=2, height=1,
                                 command=self.close_notification, relief="flat")
            close_btn.pack(side="right", padx=(0, 5), pady=10)
        
        # Автоматическое закрытие через указанное время
        if duration > 0:
            self.notification_timer = self.root.after(duration, self.close_notification)
    
    def close_notification(self):
        """Закрыть обычное уведомление"""
        if self.notification_frame and self.notification_frame.winfo_exists():
            self.notification_frame.destroy()
        if self.notification_timer:
            self.root.after_cancel(self.notification_timer)
            self.notification_timer = None
    
    def show_battle_result(self, victory, monster_name, exp_reward, loot_items=None, 
                          levels_gained=0, callback=None):
        """Показать результат боя в стилизованном интерактивном окне"""
        print(f"🎮 Показываем результат боя: победа={victory}, монстр={monster_name}")
        
        # Удаляем старое уведомление если есть
        if self.notification_frame and self.notification_frame.winfo_exists():
            self.notification_frame.destroy()
        
        # Сбрасываем состояние раскрытых предметов
        self.expanded_items = {}
        
        # Определяем стиль в зависимости от результата
        if victory:
            bg_color = "#4CAF50"
            border_color = "#388E3C"
            icon = "🎉"
            title = "ПОБЕДА!"
            title_color = "#FFD700"
        else:
            bg_color = "#f44336"
            border_color = "#D32F2F"
            icon = "💀"
            title = "ПОРАЖЕНИЕ"
            title_color = "#FFFFFF"
        
        # Создаем основное окно
        self.notification_frame = tk.Frame(self.root, bg=border_color, relief="ridge", bd=3)
        self.notification_frame.place(relx=0.5, rely=0.5, anchor="center", width=520, height=580)
        
        # Заголовок
        header_frame = tk.Frame(self.notification_frame, bg=bg_color, height=70)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text=f"{icon} {title}", font=("Arial", 20, "bold"),
                bg=bg_color, fg=title_color).pack(pady=18)
        
        # Основной контейнер с прокруткой и центрированием
        main_container = tk.Frame(self.notification_frame, bg="#1E1E1E")
        main_container.pack(fill="both", expand=True, padx=15, pady=15)
        
        # Создаем Canvas и Scrollbar для центрирования
        canvas = tk.Canvas(main_container, bg="#1E1E1E", highlightthickness=0)
        
        # Стилизованный скроллбар
        style = ttk.Style()
        style.theme_use('default')
        style.configure("Custom.Vertical.TScrollbar",
                       troughcolor='#2C2C2C',
                       background=bg_color,
                       bordercolor='#2C2C2C',
                       lightcolor=bg_color,
                       darkcolor=bg_color,
                       arrowcolor='white',
                       width=12)
        
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", 
                                 command=canvas.yview, style="Custom.Vertical.TScrollbar")
        
        # Центрирующий фрейм
        center_frame = tk.Frame(canvas, bg="#1E1E1E")
        center_window = canvas.create_window((0, 0), window=center_frame, anchor="nw")
        
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Контейнер для содержимого (будет центрироваться)
        content_frame = tk.Frame(center_frame, bg="#1E1E1E")
        content_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Функция для центрирования содержимого
        def center_content():
            canvas.update_idletasks()
            canvas_width = canvas.winfo_width()
            content_width = center_frame.winfo_reqwidth()
            
            if canvas_width > 0 and content_width > 0:
                # Если содержимое уже меньше ширины canvas, центрируем
                if content_width < canvas_width:
                    x_offset = (canvas_width - content_width) // 2
                    canvas.coords(center_window, x_offset, 0)
                    canvas.itemconfig(center_window, width=content_width)
                else:
                    # Если содержимое шире, используем полную ширину
                    canvas.itemconfig(center_window, width=canvas_width)
                    canvas.coords(center_window, 0, 0)
            
            # Обновляем область прокрутки
            canvas.configure(scrollregion=canvas.bbox("all"))
        
        # Привязываем центрирование к изменению размеров
        canvas.bind('<Configure>', lambda e: center_content())
        center_frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        
        # Информация о бое - центрируем содержимое
        if victory:
            # Иконка победы (центрируем)
            victory_icon_frame = tk.Frame(content_frame, bg="#1E1E1E")
            victory_icon_frame.pack(pady=(0, 20))
            
            tk.Label(victory_icon_frame, text="🏆", font=("Arial", 32),
                    bg="#1E1E1E", fg="#FFD700").pack()
            
            # Текст "Вы победили!" (центрируем)
            victory_text = tk.Label(content_frame, text=f"Вы победили {monster_name}!",
                                   font=("Arial", 16, "bold"), bg="#1E1E1E", fg="#4CAF50")
            victory_text.pack(pady=(0, 20))
            
            # Опыт (центрируем)
            exp_frame = tk.Frame(content_frame, bg="#1E1E1E")
            exp_frame.pack(fill="x", pady=12)
            
            tk.Label(exp_frame, text="⭐", font=("Arial", 20),
                    bg="#1E1E1E", fg="#FFD700").pack(side="left", padx=(40, 12))
            
            exp_text = tk.Label(exp_frame, text=f"Получено опыта: {exp_reward}",
                               font=("Arial", 14), bg="#1E1E1E", fg="#FFD700")
            exp_text.pack(side="left")
            
            if levels_gained > 0:
                level_frame = tk.Frame(content_frame, bg="#1E1E1E")
                level_frame.pack(fill="x", pady=20)
                
                level_up_frame = tk.Frame(level_frame, bg="#7B1FA2", relief="raised", bd=2)
                level_up_frame.pack(fill="x", padx=30, pady=8)
                
                tk.Label(level_up_frame, text="🚀 ПОВЫШЕНИЕ УРОВНЯ! 🚀", 
                        font=("Arial", 13, "bold"), bg="#7B1FA2", fg="white").pack(pady=10)
                
                level_info = tk.Label(level_up_frame, 
                                     text=f"+{levels_gained} уровень{'а' if levels_gained > 1 else ''}",
                                     font=("Arial", 12), bg="#7B1FA2", fg="#FFD700")
                level_info.pack(pady=(0, 10))
            
            # Разделитель
            separator = tk.Frame(content_frame, bg="#4CAF50", height=3)
            separator.pack(fill="x", pady=25, padx=20)
            
        else:
            # Для поражения (центрируем)
            defeat_frame = tk.Frame(content_frame, bg="#1E1E1E")
            defeat_frame.pack(pady=30)
            
            tk.Label(defeat_frame, text="💔", font=("Arial", 32),
                    bg="#1E1E1E", fg="#f44336").pack()
            
            defeat_text = tk.Label(content_frame, text=f"Вы проиграли {monster_name}",
                                  font=("Arial", 16, "bold"), bg="#1E1E1E", fg="#f44336")
            defeat_text.pack(pady=20)
            
            recovery_text = tk.Label(content_frame, text="Здоровье восстановлено наполовину",
                                    font=("Arial", 12), bg="#1E1E1E", fg="#FF9800")
            recovery_text.pack(pady=10)
        
        # Предметы лута (только для победы)
        if victory and loot_items:
            loot_title_frame = tk.Frame(content_frame, bg="#1E1E1E")
            loot_title_frame.pack(fill="x", pady=(30, 20))
            
            tk.Label(loot_title_frame, text="🎁 ВАША ДОБЫЧА:", font=("Arial", 15, "bold"),
                    bg="#1E1E1E", fg="#FF9800").pack()
            
            # Контейнер для предметов лута
            loot_container = tk.Frame(content_frame, bg="#1E1E1E")
            loot_container.pack(fill="x", pady=15, padx=10)
            
            for i, item_data in enumerate(loot_items):
                self.create_loot_item_card(loot_container, i, item_data, bg_color)
        
        # Кнопка продолжения (центрируем)
        btn_frame = tk.Frame(content_frame, bg="#1E1E1E", pady=30)
        btn_frame.pack(fill="x")
        
        continue_btn = tk.Button(btn_frame, text="▶ ПРОДОЛЖИТЬ", font=("Arial", 14, "bold"),
                                bg=bg_color, fg="white", width=22, height=2,
                                command=lambda: self.close_battle_result(callback),
                                relief="raised", bd=3)
        continue_btn.pack()
        
        # Подсказка
        hint_label = tk.Label(btn_frame, text="Нажмите кнопку выше чтобы продолжить",
                             font=("Arial", 10), bg="#1E1E1E", fg="#888888", pady=8)
        hint_label.pack()
        
        # Сохраняем callback
        self.battle_result_callback = callback
        
        # Функция для колесика мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Принудительное обновление для центрирования
        self.root.update_idletasks()
        center_content()
        
        print(f"✅ Окно результатов боя показано")
    
    def create_loot_item_card(self, parent, index, item_data, bg_color):
        """Создать интерактивную карточку предмета лута"""
        print(f"📦 Создаем карточку предмета {index}: {item_data.get('name', 'Предмет')}")
        
        # Основная карточка
        card_frame = tk.Frame(parent, bg="#2C2C2C", relief="raised", bd=2)
        card_frame.pack(fill="x", pady=8, padx=10)
        
        # Сохраняем данные в атрибутах карточки
        card_frame.item_index = index
        card_frame.item_data = item_data
        card_frame.bg_color = bg_color
        card_frame.details_frame = None
        card_frame.is_expanded = False
        
        # Заголовок карточки (всегда видим)
        header_frame = tk.Frame(card_frame, bg="#3C3C3C", height=50)
        header_frame.pack(fill="x")
        header_frame.pack_propagate(False)
        
        # Левая часть - иконка и название
        left_header = tk.Frame(header_frame, bg="#3C3C3C")
        left_header.pack(side="left", fill="both", expand=True, padx=(15, 0))
        
        item_icon = item_data.get("icon", "📦")
        item_name = item_data.get("name", "Предмет")
        
        # Укорачиваем слишком длинные названия (для компактного вида)
        if len(item_name) > 18:
            display_name = item_name[:16] + "..."
        else:
            display_name = item_name
        
        tk.Label(left_header, text=item_icon, font=("Arial", 20),
                bg="#3C3C3C", fg="white").pack(side="left", padx=(5, 10), pady=12)
        
        # Контейнер для названия
        name_container = tk.Frame(left_header, bg="#3C3C3C")
        name_container.pack(side="left", fill="both", expand=True)
        
        name_label = tk.Label(name_container, text=display_name, font=("Arial", 11, "bold"),
                             bg="#3C3C3C", fg="white", anchor="w", justify="left")
        name_label.pack(fill="both", expand=True)
        
        # Правая часть - только кнопка показать/скрыть (без редкости)
        right_header = tk.Frame(header_frame, bg="#3C3C3C")
        right_header.pack(side="right", padx=(0, 5))
        
        # Кнопка раскрытия/скрытия
        toggle_btn = tk.Button(right_header, text="▼ Подробнее", font=("Arial", 9, "bold"),
                              bg="#FF5722", fg="white", width=12, height=1,
                              command=lambda idx=index, cf=card_frame: self.toggle_item_details(idx, cf),
                              relief="raised", bd=2)
        
        print(f"✅ Кнопка создана для предмета {index}, команда привязана")
        toggle_btn.pack(side="left", padx=(0, 5), pady=10)
        
        # Сохраняем ссылку на кнопку
        card_frame.toggle_btn = toggle_btn
    def toggle_item_details(self, item_index, card_frame):
        """Переключить отображение деталей предмета"""
        print(f"🔘 Нажата кнопка для предмета {item_index}")
        
        if not card_frame.is_expanded:
            # Раскрываем
            print(f"📖 Раскрываем детали предмета {item_index}")
            card_frame.is_expanded = True
            card_frame.toggle_btn.config(text="▲")
            
            # Создаем контейнер для деталей
            details_frame = tk.Frame(card_frame, bg="#2C2C2C")
            details_frame.pack(fill="x", padx=15, pady=(0, 15), after=card_frame.winfo_children()[0])
            
            # Создаем детали
            self.create_item_details(details_frame, card_frame.item_data)
            
            card_frame.details_frame = details_frame
            
            # Изменяем высоту карточки
            current_height = card_frame.winfo_height()
            card_frame.config(height=current_height + 120)
        else:
            # Скрываем
            print(f"📕 Скрываем детали предмета {item_index}")
            card_frame.is_expanded = False
            card_frame.toggle_btn.config(text="▼")
            
            # Удаляем контейнер с деталями
            if card_frame.details_frame:
                card_frame.details_frame.destroy()
                card_frame.details_frame = None
            
            # Возвращаем исходную высоту
            card_frame.config(height=50)
    
    def create_item_details(self, container, item_data):
        """Создать детализированное описание предмета"""
        # Очищаем контейнер
        for widget in container.winfo_children():
            widget.destroy()
        
        # Фон для деталей
        details_frame = tk.Frame(container, bg="#3C3C3C", relief="sunken", bd=1, padx=10, pady=10)
        details_frame.pack(fill="x", padx=5, pady=5)
        
        # Полное название предмета
        full_name = item_data.get("name", "Предмет")
        tk.Label(details_frame, text=f"📝 {full_name}", 
                font=("Arial", 11, "bold"), bg="#3C3C3C", fg="#FFD700", 
                anchor="w", justify="left").pack(fill="x", pady=(0, 10))
        
        # Тип предмета
        item_type = item_data.get("type", "unknown")
        type_colors = {
            "weapon": "#D32F2F",
            "armor": "#388E3C",
            "consumable": "#7B1FA2"
        }
        type_color = type_colors.get(item_type, "#757575")
        
        type_frame = tk.Frame(details_frame, bg="#3C3C3C")
        type_frame.pack(fill="x", pady=5)
        
        type_text = "⚔️ Оружие" if item_type == "weapon" else "🛡️ Броня" if item_type == "armor" else "🧪 Расходник"
        tk.Label(type_frame, text=type_text, font=("Arial", 10, "bold"),
                bg=type_color, fg="white", padx=8, pady=2).pack(anchor="w")
        
        # Статистики в зависимости от типа
        if item_type == "weapon":
            # Урон
            dmg_frame = tk.Frame(details_frame, bg="#3C3C3C")
            dmg_frame.pack(fill="x", pady=5)
            
            tk.Label(dmg_frame, text="Урон:", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#FF5252", width=8, anchor="w").pack(side="left")
            tk.Label(dmg_frame, text=str(item_data.get("damage", 0)), font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
            
        elif item_type == "armor":
            # Защита
            def_frame = tk.Frame(details_frame, bg="#3C3C3C")
            def_frame.pack(fill="x", pady=5)
            
            tk.Label(def_frame, text="Защита:", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#4CAF50", width=8, anchor="w").pack(side="left")
            tk.Label(def_frame, text=str(item_data.get("defense", 0)), font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
            
        elif item_type == "consumable":
            # Эффект
            effect_frame = tk.Frame(details_frame, bg="#3C3C3C")
            effect_frame.pack(fill="x", pady=5)
            
            effect_type = item_data.get("effect", "heal")
            effect_text = "Лечение ❤️" if effect_type == "heal" else "Мана 💙"
            
            tk.Label(effect_frame, text="Эффект:", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#BB86FC", width=8, anchor="w").pack(side="left")
            tk.Label(effect_frame, text=effect_text, font=("Arial", 10),
                    bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
            
            # Значение эффекта
            value_frame = tk.Frame(details_frame, bg="#3C3C3C")
            value_frame.pack(fill="x", pady=5)
            
            tk.Label(value_frame, text="Значение:", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#FFD54F", width=8, anchor="w").pack(side="left")
            tk.Label(value_frame, text=f"+{item_data.get('value', 0)}", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
        
        # Вес
        weight_frame = tk.Frame(details_frame, bg="#3C3C3C")
        weight_frame.pack(fill="x", pady=5)
        
        tk.Label(weight_frame, text="⚖️ Вес:", font=("Arial", 10, "bold"),
                bg="#3C3C3C", fg="#FF9800", width=8, anchor="w").pack(side="left")
        tk.Label(weight_frame, text=f"{item_data.get('weight', 0):.1f} кг", font=("Arial", 10),
                bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
        
        # Требование класса (если есть)
        class_req = item_data.get("class_requirement")
        if class_req:
            class_frame = tk.Frame(details_frame, bg="#3C3C3C")
            class_frame.pack(fill="x", pady=5)
            
            tk.Label(class_frame, text="🎭 Класс:", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#4CAF50", width=8, anchor="w").pack(side="left")
            tk.Label(class_frame, text=class_req, font=("Arial", 10),
                    bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
        
        # Требование уровня (если есть)
        level_req = item_data.get("level_requirement")
        if level_req and level_req > 1:
            level_frame = tk.Frame(details_frame, bg="#3C3C3C")
            level_frame.pack(fill="x", pady=5)
            
            tk.Label(level_frame, text="📊 Уровень:", font=("Arial", 10, "bold"),
                    bg="#3C3C3C", fg="#7B1FA2", width=8, anchor="w").pack(side="left")
            tk.Label(level_frame, text=str(level_req), font=("Arial", 10),
                    bg="#3C3C3C", fg="#FFFFFF").pack(side="left", padx=(10, 0))
    
    def close_battle_result(self, callback=None):
        """Закрыть окно результата боя"""
        print(f"❌ Закрываем окно результатов боя")
        
        if self.notification_frame and self.notification_frame.winfo_exists():
            try:
                self.notification_frame.destroy()
                print(f"✅ Окно результатов боя закрыто")
            except:
                print(f"⚠️ Ошибка при закрытии окна результатов боя")
        
        # Сбрасываем состояние
        self.expanded_items.clear()
        
        # Вызываем callback если он есть
        if callback:
            print(f"📞 Вызываем callback")
            try:
                callback()
            except Exception as e:
                print(f"⚠️ Ошибка в callback: {e}")
# ============== ОСНОВНОЙ КЛАСС ==============
class RPGApp:
    def __init__(self, root):
        self.root = root
        self.config = load_config()
        self.db = PlayersDB()
        self.current_location = "Главная"
        self.player_data = {}  # Данные текущего игрока
        self.chest_items = []
        self.buttons = {}
        self.editor_window = None
        self.sidebar_open = False
        self.sidebar_frame = None
        self.sidebar_widgets = {}
        self.hamburger_btn = None
        self.current_screen = "login"
        self.battle_active = False
        self.battle_monster = None
        self.current_turn = "player"
        self.can_attack_this_turn = True
        self.turn_end_scheduled = False
        self.abilities = {}  # Словарь умений
        self.equipped_abilities = []  # Экипированные умения (максимум 3)
        self.ability_buttons = {}  # Кнопки умений в бою
        self.active_ability_effect = None  # Активный эффект умения
        self.original_bg_color = "#FFFFFF"  # Сохраняем исходный цвет фона
        self.battle_log = []  # История действий в бою
        self.max_log_entries = 8  # Максимальное количество записей в логе
        self.loot_pile_frame = None  # Фрейм для ямы с лутом
        self.loot_pile_items = []  # Предметы в текущей яме
        self.max_level = 50
        self.base_exp = 100  # Опыт для 1 уровня
        self.exp_multiplier = 1.3  # Увеличение опыта на 30% за уровень
        self.base_bag_capacity = 10.0  # Базовая вместимость на 1 уровне
        self.bag_capacity_per_level = 2.0  # +2 кг за уровень
        self.max_bag_capacity = 50.0  # Максимальная вместимость сумки
        self.chest_capacity = 100.0  # Вместимость сундука (фиксированная)
        # Таймеры
        self.regeneration_timer = None
        self.respawn_timers = {}
        self.battle_timer = None
        self.turn_update_job = None
        self.animate_job = None
        self.turn_start_time = 0
        self.update_ui_jobs = {}  # Для отслеживания заданий обновления UI
        self.MONSTER_FRAME_WIDTH = 120
        self.MONSTER_FRAME_HEIGHT = 90
        self.notification = GameNotification(root)
        # UI-элементы монстра
        self.monster_frame = None
        self.monster_respawn_canvas = None
        self.monster_respawn_timer_text = None
        # Добавьте эти атрибуты:
        self.battle_location = None
        self.player_acted_this_turn = False
        self.monster_acted_this_turn = False

        # Сначала инициализация
        self.setup_window()
        self.load_abilities()
        self.show_login_screen()
        
        
        # Потом привязки (после того как все методы определены)
        self.root.bind("<F2>", self.open_contextual_editor)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

    def on_closing(self):
        """Обработчик закрытия окна"""
        try:
            # Сохраняем текущую локацию
            if self.player_data:
                self.player_data["current_location"] = self.current_location
                self.save_current_player()
                self.save_chest()  # Сохраняем сундук перед закрытием
        
            self.cancel_all_timers()
            self.save_chest()
            print("💾 Все данные сохранены перед выходом")
            # Также удаляем фреймы если они есть
            if hasattr(self, 'monster_frames'):
                for monster_key, frame_data in self.monster_frames.items():
                    frame = frame_data.get('frame')
                    if frame and frame.winfo_exists():
                        frame.destroy()
            
            if hasattr(self, 'respawn_frames'):
                for monster_key, frame_data in self.respawn_frames.items():
                    frame = frame_data.get('frame')
                    if frame and frame.winfo_exists():
                        frame.destroy()
                        
        except Exception as e:
            print(f"⚠️ Ошибка при сохранении перед выходом: {e}")
        
        self.root.destroy()

    def cancel_all_timers(self):
        """Отмена всех таймеров"""
        try:
            # Отменяем основные таймеры
            timers_to_cancel = ['regeneration_timer', 'battle_timer', 'turn_update_job', 'animate_job']
            for timer_name in timers_to_cancel:
                if hasattr(self, timer_name):
                    timer = getattr(self, timer_name)
                    if timer:
                        try:
                            self.root.after_cancel(timer)
                        except:
                            pass
                    setattr(self, timer_name, None)
            
            # Отменяем таймеры возрождения монстров
            if hasattr(self, 'respawn_timers'):
                for location, timer_id in list(self.respawn_timers.items()):
                    if timer_id:
                        try:
                            self.root.after_cancel(timer_id)
                        except:
                            pass
                self.respawn_timers.clear()
            
            # Отменяем все задания обновления UI
            if hasattr(self, 'update_ui_jobs'):
                for job_id in list(self.update_ui_jobs.values()):
                    if job_id:
                        try:
                            self.root.after_cancel(job_id)
                        except:
                            pass
                self.update_ui_jobs.clear()

            # Также удаляем фреймы монстров если нужно
            if hasattr(self, 'monster_frames'):
                for monster_key, frame_data in self.monster_frames.items():
                    frame = frame_data.get('frame')
                    if frame and frame.winfo_exists():
                        frame.destroy()
                self.monster_frames = {}
            
            if hasattr(self, 'respawn_frames'):
                for monster_key, frame_data in self.respawn_frames.items():
                    frame = frame_data.get('frame')
                    if frame and frame.winfo_exists():
                        frame.destroy()
                self.respawn_frames = {}
                
        except Exception as e:
            print(f"⚠️ Ошибка при отмене таймеров: {e}")

    def setup_window(self):
        wcfg = self.config["window"]
        self.root.title(wcfg["title"])
        self.root.geometry(f"{wcfg['width']}x{wcfg['height']}")
        self.root.configure(bg=wcfg["bg"])
        self.original_bg_color = wcfg["bg"]  # Сохраняем исходный цвет
        self.root.resizable(False, False)

    # ================ РЕГИСТРАЦИЯ И АВТОРИЗАЦИЯ ================
    def show_login_screen(self):
        """Экран входа/регистрации"""
        self.current_screen = "login"
        self.clear_window()
        
        # Фон с градиентом
        bg_frame = tk.Frame(self.root, bg="#1a1a2e")
        bg_frame.pack(fill="both", expand=True)
        
        # Основной контейнер
        main_container = tk.Frame(bg_frame, bg="#16213e", relief="ridge", bd=4)
        main_container.place(relx=0.5, rely=0.5, anchor="center", width=500, height=400)
        
        # Заголовок
        header_frame = tk.Frame(main_container, bg="#0f3460", height=70)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text="🎮 ALDOS RPG", 
                font=("Arial", 18, "bold"), bg="#0f3460", fg="white").pack(pady=15)
        
        # Форма входа
        form_frame = tk.Frame(main_container, bg="#16213e", padx=30, pady=30)
        form_frame.pack(fill="both", expand=True)
        
        # Имя пользователя
        tk.Label(form_frame, text="Имя персонажа:", font=("Arial", 11, "bold"),
                bg="#16213e", fg="#4CC9F0").pack(anchor="w", pady=(0, 5))
        
        self.username_var = tk.StringVar()
        username_entry = tk.Entry(form_frame, textvariable=self.username_var, 
                                 font=("Arial", 12), width=30, bg="white", fg="#333", bd=2, relief="sunken")
        username_entry.pack(pady=(0, 15), ipady=5)
        username_entry.focus()
        
        # Сообщение
        self.login_message = tk.Label(form_frame, text="", font=("Arial", 10), 
                                     bg="#16213e", fg="#F72585")
        self.login_message.pack(pady=(0, 20))
        
        # Кнопки
        btn_frame = tk.Frame(form_frame, bg="#16213e")
        btn_frame.pack(fill="x", pady=10)
        
        login_btn = tk.Button(btn_frame, text="🎮 Войти", font=("Arial", 12, "bold"),
                            bg="#4CAF50", fg="white", width=15, height=2,
                            command=self.login)
        login_btn.pack(side="left", padx=5, pady=10)
        
        register_btn = tk.Button(btn_frame, text="📝 Создать", font=("Arial", 12, "bold"),
                               bg="#2196F3", fg="white", width=15, height=2,
                               command=self.show_register_screen)
        register_btn.pack(side="right", padx=5, pady=10)
        
        # Список существующих персонажей
        players = self.db.get_all_players()
        if players:
            players_frame = tk.Frame(main_container, bg="#0f3460", padx=10, pady=10)
            players_frame.pack(fill="x", padx=20, pady=(0, 10))
            
            tk.Label(players_frame, text="📋 Существующие персонажи:", 
                    font=("Arial", 10, "bold"), bg="#0f3460", fg="#FFD54F").pack(anchor="w", pady=(0, 5))
            
            # Показываем первые 5 персонажей
            for player in players[:5]:
                player_info = self.db.get_player_stats(player)
                status_color = "#f44336" if player_info.get("is_banned") else "#4CAF50"
                status_text = "🔴 Заблокирован" if player_info.get("is_banned") else "🟢 Активен"
                
                player_frame = tk.Frame(players_frame, bg="#1a1a2e", relief="flat", padx=10, pady=5)
                player_frame.pack(fill="x", pady=2)
                
                tk.Label(player_frame, text=f"👤 {player} - {player_info.get('class', 'Воин')}", 
                        font=("Arial", 9), bg="#1a1a2e", fg="white").pack(side="left")
                tk.Label(player_frame, text=status_text, font=("Arial", 8, "bold"),
                        bg=status_color, fg="white", padx=5, pady=2).pack(side="right")

    def show_register_screen(self):
        """Экран создания нового персонажа"""
        self.current_screen = "register"
        self.clear_window()
        
        # Фон с градиентом
        bg_frame = tk.Frame(self.root, bg="#1a1a2e")
        bg_frame.pack(fill="both", expand=True)
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(bg_frame, bg="#16213e", relief="ridge", bd=4)
        main_container.place(relx=0.5, rely=0.5, anchor="center", width=580, height=420)
        
        # Заголовок
        header_frame = tk.Frame(main_container, bg="#0f3460", height=70)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text="📝 СОЗДАНИЕ ПЕРСОНАЖА", 
                font=("Arial", 18, "bold"), bg="#0f3460", fg="white").pack(pady=15)
        
        # Контейнер с прокруткой
        scroll_container = tk.Frame(main_container, bg="#16213e")
        scroll_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Canvas и Scrollbar
        canvas = tk.Canvas(scroll_container, bg="#16213e", highlightthickness=0)
        scrollbar = tk.Scrollbar(scroll_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#16213e")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Контейнер для формы
        form_container = tk.Frame(scrollable_frame, bg="#16213e", width=540)
        form_container.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Имя персонажа
        name_card = tk.Frame(form_container, bg="#1a1a2e", relief="ridge", bd=2, padx=20, pady=15)
        name_card.pack(fill="x", pady=(0, 15))
        
        tk.Label(name_card, text="📝 ИМЯ ПЕРСОНАЖА", 
                font=("Arial", 12, "bold"), bg="#1a1a2e", fg="#e94560").pack(anchor="w", pady=(0, 10))
        
        name_var = tk.StringVar()
        name_entry = tk.Entry(name_card, textvariable=name_var, 
                             font=("Arial", 12), width=40, bg="white", fg="#333", bd=2, relief="sunken")
        name_entry.pack(pady=5, ipady=5)
        name_entry.focus()
        
        # Класс персонажа
        class_card = tk.Frame(form_container, bg="#1a1a2e", relief="ridge", bd=2, padx=20, pady=15)
        class_card.pack(fill="x", pady=(0, 15))
        
        tk.Label(class_card, text="🎭 ВЫБЕРИТЕ КЛАСС", 
                font=("Arial", 12, "bold"), bg="#1a1a2e", fg="#e94560").pack(anchor="w", pady=(0, 15))
        
        class_var = tk.StringVar(value="Воин")
        
        # Контейнер для карточек классов
        class_cards_container = tk.Frame(class_card, bg="#1a1a2e")
        class_cards_container.pack(fill="x", pady=5)
        
        classes = [
            ("⚔️ ВОИН", "Воин", "#C62828", 
             "Сильный воин с высоким здоровьем и уроном в ближнем бою.\n\n• 150 HP\n• 10 MP"),
            ("🔮 МАГ", "Маг", "#7B1FA2", 
             "Могущественный маг, использующий ману для магических атак.\n\n• 75 HP\n• 40 MP\n• Магические атаки"),
            ("🏹 ОХОТНИК", "Охотник", "#388E3C", 
             "Ловкий стрелок, специалист дальнего боя.\n\n• 100 HP\n• 20 MP")
        ]
        
        self.class_buttons = []
        
        for i, (text, value, color, desc) in enumerate(classes):
            # Карточка класса с увеличенной высотой
            class_btn_card = tk.Frame(class_cards_container, bg=color, relief="raised", bd=3, 
                                     padx=15, pady=15, width=170, height=180)
            class_btn_card.pack(side="left", fill="both", expand=True, padx=5, pady=5)
            class_btn_card.pack_propagate(False)  # Фиксируем размер
            
            # Кнопка выбора класса
            btn = tk.Radiobutton(class_btn_card, text=text, variable=class_var, value=value,
                                font=("Arial", 10, "bold"), bg=color, fg="white",
                                selectcolor=color, indicatoron=0, width=14, height=2,
                                activebackground=color, activeforeground="white")
            btn.pack(pady=(0, 10))
            
            # Разделитель
            separator = tk.Frame(class_btn_card, bg="white", height=1)
            separator.pack(fill="x", pady=(0, 10))
            
            # Описание класса
            desc_label = tk.Label(class_btn_card, text=desc, font=("Arial", 8), 
                                 bg=color, fg="#ffffff", justify="left", wraplength=140)
            desc_label.pack(fill="both", expand=True)
            
            self.class_buttons.append(btn)
        
        # Пол персонажа
        gender_card = tk.Frame(form_container, bg="#1a1a2e", relief="ridge", bd=2, padx=20, pady=15)
        gender_card.pack(fill="x", pady=(0, 15))
        
        tk.Label(gender_card, text="👤 ВЫБЕРИТЕ ПОЛ", 
                font=("Arial", 12, "bold"), bg="#1a1a2e", fg="#e94560").pack(anchor="w", pady=(0, 15))
        
        gender_var = tk.StringVar(value="Мужчина")
        
        gender_buttons_frame = tk.Frame(gender_card, bg="#1a1a2e")
        gender_buttons_frame.pack(fill="x", pady=10)
        
        # Кнопка мужского пола
        male_frame = tk.Frame(gender_buttons_frame, bg="#2196F3", relief="raised", bd=2, padx=30, pady=15)
        male_frame.pack(side="left", fill="both", expand=True, padx=10)
        
        tk.Radiobutton(male_frame, text="👨 МУЖЧИНА", variable=gender_var, 
                      value="Мужчина", font=("Arial", 11, "bold"), bg="#2196F3", fg="white",
                      selectcolor="#1976D2", indicatoron=0, width=15, height=2).pack()
        
        # Кнопка женского пола
        female_frame = tk.Frame(gender_buttons_frame, bg="#E91E63", relief="raised", bd=2, padx=30, pady=15)
        female_frame.pack(side="right", fill="both", expand=True, padx=10)
        
        tk.Radiobutton(female_frame, text="👩 ЖЕНЩИНА", variable=gender_var, 
                      value="Женщина", font=("Arial", 11, "bold"), bg="#E91E63", fg="white",
                      selectcolor="#C2185B", indicatoron=0, width=15, height=2).pack()
        
        # Кнопка подтверждения
        confirm_frame = tk.Frame(form_container, bg="#16213e", pady=20)
        confirm_frame.pack(fill="x", pady=(10, 20))
        
        def register():
            username = name_var.get().strip()
            player_class = class_var.get()
            gender = gender_var.get()
            
            if not username:
                self.notification.show_notification("Введите имя персонажа", "warning", 3000)
                return
            
            # Проверяем, не заблокирован ли игрок
            if self.db.is_banned(username):
                ban_reason = self.db.get_ban_reason(username)
                self.notification.show_notification(
                    f"Игрок заблокирован! Причина: {ban_reason}",
                    "error",
                    5000
                )
                return
            
    # Проверяем, существует ли уже игрок
            if self.db.player_exists(username):
                # Загружаем существующего игрока
                self.load_player(username)
                # Переходим в сохраненную локацию
                saved_location = self.player_data.get("current_location", "Главная")
                print(f"📍 Восстанавливаем сохраненную локацию: {saved_location}")
        
                if saved_location == "Главная":
                    self.show_main_menu()
                else:
                    self.current_screen = "location"
                    self.current_location = saved_location
                    self.show_location(saved_location)
            else:
                # Устанавливаем характеристики в зависимости от класса
                if player_class == "Воин":
                    hp, mp = 150, 10
                elif player_class == "Маг":
                    hp, mp = 75, 40
                elif player_class == "Охотник":
                    hp, mp = 100, 20
                else:
                    hp, mp = 100, 20
                
                # Базовая экипировка в зависимости от класса
                base_items = {
                    "Воин": [],
                    "Маг": [],
                    "Охотник": []
                }
                
                self.player_data = {
                    "username": username,
                    "name": username,
                    "class": player_class,
                    "gender": gender,
                    "hp": hp,
                    "hp_max": hp,
                    "mp": mp,
                    "mp_max": mp,
                    "inventory": base_items.get(player_class, []),
                    "equipped": {},
                    "equipped_abilities": [],
                    "current_location": "Главная",
                    "last_location": "Главная",
                    "level": 1,
                    "experience": 0,
                    "gold": 100,
                    "created_at": datetime.now().isoformat()
                }
                
                # Регистрируем игрока в базе данных
                self.db.register_player(username, self.player_data)
                self.show_main_menu()
        
        confirm_btn = tk.Button(confirm_frame, text="✅ НАЧАТЬ ПРИКЛЮЧЕНИЕ", 
                               font=("Arial", 12, "bold"), bg="#4CAF50", fg="white",
                               command=register, width=30, height=2, relief="raised", bd=3)
        confirm_btn.pack()
        
        # Кнопка назад
        back_btn = tk.Button(form_container, text="◀ Назад", font=("Arial", 10, "bold"),
                           bg="#757575", fg="white", width=15,
                           command=self.show_login_screen)
        back_btn.pack(pady=(10, 0))
        
        # Подсказка внизу
        tip_frame = tk.Frame(scrollable_frame, bg="#0f3460", pady=10)
        tip_frame.pack(side="bottom", fill="x", pady=(20, 0))
        
        tk.Label(tip_frame, text="💡 Совет: Выберите класс, соответствующий вашему стилю игры!", 
                font=("Arial", 9), bg="#0f3460", fg="#ffffff").pack()
        
        # Функция для колесика мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Устанавливаем начальную позицию прокрутки
        canvas.yview_moveto(0)

    def login(self):
        """Вход в игру"""
        username = self.username_var.get().strip()
        
        if not username:
            self.login_message.config(text="⚠️ Введите имя персонажа!", fg="#F72585")
            return
        
        # Проверяем, не заблокирован ли игрок
        if self.db.is_banned(username):
            ban_reason = self.db.get_ban_reason(username)
            self.notification.show_notification(
                f"Игрок заблокирован! Причина: {ban_reason}",
                "error",
                5000
            )
            return
        
        # Проверяем, существует ли игрок
        if not self.db.player_exists(username):
            # Если игрок не существует, переходим к созданию
            self.username_var.set(username)
            self.show_register_screen()
            return
        
        # Загружаем игрока
        self.load_player(username)

        saved_location = self.player_data.get("current_location", "Главная")
        print(f"📍 Восстанавливаем сохраненную локацию: {saved_location}")
    
        if saved_location == "Главная":
            self.show_main_menu()
        else:
            # Прямой переход в сохраненную локацию
            self.current_screen = "location"
            self.current_location = saved_location
            self.show_location(saved_location)


    # ================ ЗАГРУЗКА И СОХРАНЕНИЕ ИГРОКА ================
    def load_player(self, username):
        """Загрузить данные игрока"""
        self.player_data = self.db.get_player(username)
        if not self.player_data:
            # Создаем базовые данные для нового игрока
            self.player_data = {
                "username": username,
                "name": username,
                "class": "Воин",
                "gender": "Мужчина",
                "hp": 100,
                "hp_max": 100,
                "mp": 20,
                "mp_max": 20,
                "inventory": [],
                "equipped": {},
                "equipped_abilities": [],
                "current_location": "Главная",
                "last_location": "Главная",
                "level": 1,
                "experience": 0,
                "gold": 100
            }
        
        self.equipped_abilities = []

        # Загружаем экипированные умения
        if "equipped_abilities" in self.player_data:
            player_equipped_abilities = self.player_data["equipped_abilities"]

            for ability in self.abilities.values():
                ability.is_equipped = False

            self.equipped_abilities = self.player_data.get("equipped_abilities", [])

            for ability in self.abilities.values():
                ability.is_equipped = False

            for ab_id in self.equipped_abilities:
                if ab_id in self.abilities:
                    self.abilities[ab_id].is_equipped = True
                    print(f"✅ Загружено экипированное умение: {self.abilities[ab_id].name}")
        
        # Загружаем текущую локацию - ВАЖНО!
        if "current_location" in self.player_data:
            self.current_location = self.player_data["current_location"]
        else:
            self.current_location = "Главная"
            self.player_data["current_location"] = self.current_location
        
        # ВАЖНО: Загружаем сундук игрока
        self.load_chest()
        
        print(f"👤 Загружен игрок: {username}")
        print(f"📍 Текущая локация: {self.current_location}")
        print(f"📋 Экипированные умения игрока: {self.equipped_abilities}")

    # ================ СИСТЕМА УРОВНЕЙ И ОПЫТА ================
    def calculate_exp_for_level(self, level):
        """Рассчитать необходимое количество опыта для указанного уровня"""
        if level <= 1:
            return self.base_exp
        
        exp_required = self.base_exp
        for i in range(2, level + 1):
            exp_required = int(exp_required * self.exp_multiplier)
        
        return exp_required
    
    def add_experience(self, amount, show_message=True):
        """Добавить опыт игроку"""
        if not self.player_data:
            return
        
        current_level = self.player_data.get("level", 1)
        current_exp = self.player_data.get("experience", 0)
        exp_for_next_level = self.calculate_exp_for_level(current_level)
        
        # Добавляем опыт
        new_exp = current_exp + amount
        levels_gained = 0
        
        # Проверяем повышение уровня
        while new_exp >= exp_for_next_level and current_level < self.max_level:
            new_exp -= exp_for_next_level
            current_level += 1
            levels_gained += 1
            
            # Обновляем характеристики при повышении уровня
            self.level_up_benefits(current_level)
            
            # Обновляем опыт для следующего уровня
            exp_for_next_level = self.calculate_exp_for_level(current_level)
        
        # Сохраняем изменения
        self.player_data["level"] = current_level
        self.player_data["experience"] = new_exp
        
        # Показываем уведомления
        if show_message:
            if levels_gained > 0:
                self.notification.show_notification(
                    f"🎉 Повышение уровня! Теперь у вас {current_level} уровень",
                    "level",
                    4000
                )
            else:
                self.notification.show_notification(
                    f"📈 Получено {amount} опыта",
                    "info",
                    3000
                )
        
        # Обновляем интерфейс
        self.update_level_display()
        self.save_current_player()
        
        return levels_gained
    
    def level_up_benefits(self, new_level):
        """Награды за повышение уровня"""
        player_class = self.player_data.get("class", "Воин")
        
        # Увеличиваем максимальное здоровье и ману
        hp_increase = 10
        mp_increase = 5
        
        if player_class == "Воин":
            hp_increase = 15
            mp_increase = 2
        elif player_class == "Маг":
            hp_increase = 5
            mp_increase = 10
        elif player_class == "Охотник":
            hp_increase = 8
            mp_increase = 5
        
        self.player_data["hp_max"] += hp_increase
        self.player_data["mp_max"] += mp_increase
        
        # Добавляем сообщение об увеличении вместимости
        old_capacity = self.get_bag_capacity_for_level(new_level - 1)
        new_capacity = self.get_bag_capacity_for_level(new_level)
        
        if new_capacity > old_capacity:
            capacity_increase = new_capacity - old_capacity
            self.notification.show_notification(
                f"🎒 Вместимость сумки увеличена на {capacity_increase:.1f} кг",
                "info",
                3000
            )

        # Восстанавливаем здоровье и ману полностью
        self.player_data["hp"] = self.player_data["hp_max"]
        self.player_data["mp"] = self.player_data["mp_max"]
        
        # Добавляем золото за уровень
        gold_reward = new_level * 10
        self.player_data["gold"] = self.player_data.get("gold", 0) + gold_reward
        
        # Урон автоматически увеличивается через calculate_base_level_damage()
        # при следующем вызове calculate_stats()
    
    def update_level_display(self):
        """Обновить отображение уровня и опыта во всех интерфейсах"""
        if not self.player_data:
            return
        
        # Обновляем в боковом меню
        if hasattr(self, 'level_widgets'):
            for widget in self.level_widgets.values():
                if widget and widget.winfo_exists():
                    self.refresh_level_widget(widget)
        
        # Обновляем в интерфейсе персонажа
        if hasattr(self, 'character_level_widgets'):
            for widget in self.character_level_widgets.values():
                if widget and widget.winfo_exists():
                    self.refresh_level_widget(widget)
        
        # Обновляем в инвентаре
        if hasattr(self, 'inventory_level_widgets'):
            for widget in self.inventory_level_widgets.values():
                if widget and widget.winfo_exists():
                    self.refresh_level_widget(widget)
    
    def refresh_level_widget(self, widget_container):
        """Обновить виджет уровня"""
        if not widget_container or not widget_container.winfo_exists():
            return
        
        try:
            # Очищаем контейнер
            for child in widget_container.winfo_children():
                child.destroy()
            
            # Получаем текущие данные
            current_level = self.player_data.get("level", 1)
            current_exp = self.player_data.get("experience", 0)
            exp_for_next_level = self.calculate_exp_for_level(current_level)
            
            # Создаем новый виджет
            level_frame = tk.Frame(widget_container, bg=widget_container.cget("bg"))
            level_frame.pack(fill="x", pady=2)
            
            # Отображаем уровень
            tk.Label(level_frame, text=f"📊 Уровень: {current_level}", 
                    font=("Arial", 10, "bold"), bg=level_frame.cget("bg"), fg="#7B1FA2").pack(anchor="w")
            
            # Отображаем прогресс-бар опыта
            exp_percent = (current_exp / exp_for_next_level) * 100 if exp_for_next_level > 0 else 0
            
            # Прогресс-бар
            exp_frame = tk.Frame(level_frame, bg="#E0E0E0", height=12, relief="sunken", bd=1)
            exp_frame.pack(fill="x", pady=2)
            exp_frame.pack_propagate(False)
            
            # Заполненная часть
            fill_width = min(int(exp_percent * 1.5), 150)  # Максимальная ширина 150px
            fill_color = "#4CAF50" if exp_percent < 70 else "#FF9800" if exp_percent < 90 else "#F44336"
            
            tk.Frame(exp_frame, bg=fill_color, width=fill_width).pack(side="left", fill="y")
            
            # Текст опыта
            exp_text = f"Опыт: {current_exp}/{exp_for_next_level}"
            if current_level >= self.max_level:
                exp_text = "Макс. уровень достигнут! 🏆"
            
            tk.Label(level_frame, text=exp_text, font=("Arial", 8), 
                    bg=level_frame.cget("bg"), fg="#616161").pack(anchor="w")
        except:
            pass

    def save_current_player(self):
        """Сохранить текущего игрока"""
        if self.player_data:
            # Обновляем текущую локацию
            self.player_data["current_location"] = self.current_location
            
            # Обновляем экипированные умения
            self.player_data["equipped_abilities"] = self.equipped_abilities
            
            # Сохраняем в базу данных
            self.db.update_player(self.player_data["username"], self.player_data)
            print(f"💾 Сохранен игрок: {self.player_data['username']}")
            print(f"📍 Сохранена локация: {self.current_location}")
            print(f"💾 Сохранены экипированные умения: {self.equipped_abilities}")
    # ================ PLAYER & ITEMS & CHEST ================
# ================ PLAYER & ITEMS & CHEST ================
    def load_abilities(self):
        """Загрузка умений из файла"""
        abilities_data = safe_load_json("data/abilities.json", {
            "warrior_reflect": {
                "id": "warrior_reflect",
                "name": "Отражающий щит",
                "description": "Отражает следующую атаку и наносит 30% от полученного урона",
                "icon": "🛡️",
                "class_requirement": "Воин",
                "cooldown": 2,
                "mana_cost": 5,
                "effect_type": "defense",
                "value": 30
            },
            "mage_stun": {
                "id": "mage_stun",
                "name": "Оглушающая молния",
                "description": "Оглушает монстра на 1-2 хода",
                "icon": "⚡",
                "class_requirement": "Маг",
                "cooldown": 3,
                "mana_cost": 15,
                "effect_type": "stun",
                "value": "1-2"
            },
            "hunter_double": {
                "id": "hunter_double",
                "name": "Двойной выстрел",
                "description": "Двойной удар с уроном 50%-150% от базового",
                "icon": "🏹",
                "class_requirement": "Охотник",
                "cooldown": 2,
                "mana_cost": 10,
                "effect_type": "damage",
                "value": "50-150"
            }
        })
        
        # Преобразуем в объекты Ability
        self.abilities = {}
        for ab_id, ab_data in abilities_data.items():
            self.abilities[ab_id] = Ability(
                id=ab_id,
                name=ab_data["name"],
                description=ab_data["description"],
                icon=ab_data["icon"],
                class_requirement=ab_data["class_requirement"],
                cooldown=ab_data["cooldown"],
                mana_cost=ab_data["mana_cost"],
                effect_type=ab_data["effect_type"],
                value=ab_data.get("value")
            )
        
        # Загружаем экипированные умения игрока
        if "equipped_abilities" in self.player_data:
            self.equipped_abilities = self.player_data["equipped_abilities"]
            for ab_id in self.equipped_abilities:
                if ab_id in self.abilities:
                    self.abilities[ab_id].is_equipped = True

    def save_abilities(self):
        """Сохранение умений в файл"""
        abilities_data = {}
        for ab_id, ability in self.abilities.items():
            abilities_data[ab_id] = {
                "id": ability.id,
                "name": ability.name,
                "description": ability.description,
                "icon": ability.icon,
                "class_requirement": ability.class_requirement,
                "cooldown": ability.cooldown,
                "mana_cost": ability.mana_cost,
                "effect_type": ability.effect_type,
                "value": ability.value
            }
        safe_save_json("data/abilities.json", abilities_data)

    @staticmethod
    def load_static_items():
        items = safe_load_json("data/items.json", {
            "wooden_sword": {
                "name": "Деревянный меч", "type": "weapon", "subtype": "melee",
                "damage": 5, "weight": 2.0, "icon": "🗡️", "class_requirement": "Воин"
            },
            "iron_sword": {
                "name": "Железный меч", "type": "weapon", "subtype": "melee",
                "damage": 8, "weight": 3.0, "icon": "⚔️", "class_requirement": "Воин"
            },
            "hunting_bow": {
                "name": "Охотничий лук", "type": "weapon", "subtype": "ranged",
                "damage": 6, "weight": 1.5, "icon": "🏹", "class_requirement": "Охотник"
            },
            "wizard_staff": {
                "name": "Посох мага", "type": "weapon", "subtype": "melee",
                "damage": 3, "weight": 2.5, "icon": "🔮", "class_requirement": "Маг"
            },
            "shirt": {"name": "Рубашка", "type": "armor", "subtype": "body",
                      "defense": 1, "weight": 0.8, "icon": "👕"},
            "boots": {"name": "Сапоги", "type": "armor", "subtype": "feet",
                      "defense": 2, "weight": 1.5, "icon": "👢"},
            "gloves": {"name": "Перчатки", "type": "armor", "subtype": "hands",
                       "defense": 2, "weight": 0.6, "icon": "🧤"},
            "iron_helmet": {"name": "Железный шлем", "type": "armor", "subtype": "head",
                           "defense": 3, "weight": 1.2, "icon": "⛑️"},
            "leather_armor": {"name": "Кожаный доспех", "type": "armor", "subtype": "body",
                              "defense": 5, "weight": 4.0, "icon": "🥋"},
            "health_potion": {"name": "Зелье здоровья", "type": "consumable", 
                             "effect": "heal", "value": 20, "weight": 0.3, "icon": "🧪"}
        })
        return items

    def load_items(self):
        return self.load_static_items()

    def save_items(self, items):
        safe_save_json("data/items.json", items)

    def load_chest(self):
        """Загрузить сундук игрока - ИСПРАВЛЕНО: уникальный файл для каждого игрока"""
        if self.player_data:
            username = self.player_data.get("username")
            if username:
                chest_file = f"data/chest_{username}.json"  # Уникальный файл для каждого игрока
                data = safe_load_json(chest_file, {"items": []})
                self.chest_items = data.get("items", [])
                print(f"📦 Загружен сундук игрока {username}: {len(self.chest_items)} предметов")

    def save_chest(self):
        """Сохранить сундук игрока - ИСПРАВЛЕНО: уникальный файл для каждого игрока"""
        if self.player_data:
            username = self.player_data.get("username")
            if username:
                chest_file = f"data/chest_{username}.json"  # Уникальный файл для каждого игрока
                safe_save_json(chest_file, {"items": self.chest_items})
                print(f"💾 Сохранен сундук игрока {username}: {len(self.chest_items)} предметов")

    def calculate_weight(self, item_ids_or_objects):
        items = self.load_items()
        total_weight = 0
        
        for item in item_ids_or_objects:
            if isinstance(item, dict):
                # Это объект предмета из лута
                total_weight += item.get("weight", 0)
            else:
                # Это ID предмета
                item_data = items.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        return total_weight

    # ================ НОВАЯ СИСТЕМА БРОНИ И УРОНА ================
    def calculate_armor(self):
        """Рассчитать общую защиту от экипировки"""
        equipped = self.player_data.get("equipped", {})
        total_armor = 0
        items_db = self.load_items()
        
        for slot in ["head", "body", "hands", "feet"]:
            item = equipped.get(slot)
            if not item:
                continue
            
            if isinstance(item, dict):
                # Это объект предмета из лута
                if item.get("type") == "armor":
                    total_armor += item.get("defense", 0)
            else:
                # Это ID предмета
                item_data = items_db.get(item, {})
                if item_data.get("type") == "armor":
                    total_armor += item_data.get("defense", 0)
        
        return total_armor

    def apply_armor_to_damage(self, damage, armor):
        """Формула брони: урон уменьшается на % в зависимости от брони"""
        if armor <= 0:
            return damage
        
        # Формула: эффективность брони = armor / (armor + 50)
        # Максимальное уменьшение урона - 50% при 50+ брони
        damage_reduction_percent = min(50, (armor / (armor + 50)) * 100)
        reduced_damage = damage * (1 - damage_reduction_percent / 100)
        
        # Округляем до целого числа
        final_damage = max(1, int(round(reduced_damage)))
        return final_damage

    def calculate_stats(self):
        """Рассчитать все характеристики персонажа"""
        # 1. Базовый урон (без оружия) зависит от уровня
        base_level_damage = self.calculate_base_level_damage()
        
        # 2. Бонус от оружия
        weapon_bonus = self.calculate_weapon_damage()
        
        # 3. Бонус от класса
        class_bonus = self.calculate_class_damage_bonus()
        
        # 4. Суммарный урон
        total_damage = base_level_damage + weapon_bonus + class_bonus
        
        # 5. Броня
        armor = self.calculate_armor()
        
        return {"damage": total_damage, "armor": armor}
    
    def calculate_base_level_damage(self):
        """Рассчитать базовый урон от уровня персонажа"""
        level = self.player_data.get("level", 1)
        
        # Формула: базовый урон = 1 + (уровень // 3)
        # Урон увеличивается на 1 каждые 3 уровня
        base_damage = 1 + (level // 3)
        
        # Минимальный урон 1, максимальный 10 от уровня
        return min(max(base_damage, 1), 10)
    
    def calculate_weapon_damage(self):
        """Рассчитать урон от оружия"""
        equipped = self.player_data.get("equipped", {})
        weapon = equipped.get("weapon")
        
        if not weapon:
            return 0
        
        items_db = self.load_items()
        
        if isinstance(weapon, dict):
            # Это объект оружия из лута
            weapon_data = weapon
        else:
            # Это ID оружия
            weapon_data = items_db.get(weapon, {})
        
        if weapon_data.get("type") != "weapon":
            return 0
        
        # Проверяем требования класса
        class_req = weapon_data.get("class_requirement")
        player_class = self.player_data.get("class")
        
        if class_req and class_req != player_class:
            return 0  # Неправильный класс для оружия
        
        # Возвращаем урон оружия
        return weapon_data.get("damage", 0)
    
    def calculate_class_damage_bonus(self):
        """Рассчитать бонус урона от класса"""
        player_class = self.player_data.get("class", "Воин")
        level = self.player_data.get("level", 1)
        
        class_bonuses = {
            "Воин": level // 2,      # +1 урона каждые 2 уровня
            "Маг": level // 4,       # +1 урона каждые 4 уровня
            "Охотник": level // 3    # +1 урона каждые 3 уровня
        }
        
        return class_bonuses.get(player_class, 0)

    def can_equip_item(self, item_data):
        """Проверить, может ли игрок экипировать предмет"""
        player_level = self.player_data.get("level", 1)
        item_level_req = item_data.get("level_requirement", 1)
        
        # Проверяем требование уровня
        if player_level < item_level_req:
            return False, f"Требуется уровень {item_level_req}"
        
        # Проверяем требование класса для оружия
        if item_data.get("type") == "weapon":
            class_req = item_data.get("class_requirement")
            player_class = self.player_data.get("class")
            
            if class_req and class_req != player_class:
                return False, f"Только для {class_req}"
        
        return True, "Можно экипировать"

    def is_admin(self):
        """Проверка, является ли текущий игрок администратором"""
        if not self.player_data:
            return False
        username = self.player_data.get("username", "")
        return self.db.is_admin(username)

    def show_animated_message(self, text, color="#f44336", duration=2500):
        """Показать анимированное сообщение (альтернатива для совместимости)"""
        # Преобразуем цвет в тип уведомления
        if color == "#4CAF50":
            ntype = "success"
        elif color == "#FF9800":
            ntype = "warning"
        elif color == "#2196F3":
            ntype = "info"
        elif color == "#7B1FA2":
            ntype = "level"
        else:
            ntype = "info"
        
        self.notification.show_notification(text, ntype, duration)

    def animate_gain(self, parent, x, y, text="+1", color="green"):
        """Анимация получения предмета/статистики"""
        # Проверяем, существует ли еще родительский виджет
        if not parent or not parent.winfo_exists():
            return
            
        # Отменяем предыдущую анимацию для этого виджета
        if hasattr(self, 'animate_job'):
            try:
                self.root.after_cancel(self.animate_job)
            except:
                pass
        
        try:
            label = tk.Label(parent, text=text, font=("Arial", 12, "bold"), 
                             fg=color, bg=parent.cget("bg"))
            label.place(x=x, y=y, anchor="center")
            
            def fade_out(opacity=1.0):
                try:
                    # Проверяем, существуют ли виджеты
                    if not parent.winfo_exists() or not label.winfo_exists():
                        if label.winfo_exists():
                            label.destroy()
                        return
                    
                    if opacity > 0:
                        new_y = y - (15 * (1 - opacity))
                        label.place(y=new_y)
                        opacity -= 0.1
                        self.animate_job = self.root.after(50, lambda: fade_out(opacity))
                    else:
                        if label.winfo_exists():
                            label.destroy()
                except tk.TclError:
                    # Если виджет уже уничтожен, просто выходим
                    pass
            
            fade_out()
        except tk.TclError:
            # Если произошла ошибка при создании виджета, просто игнорируем анимацию
            pass

    def show_animated_message(self, text, color="#f44336", duration=2500):
        """Показать анимированное сообщение"""
        try:
            # Удаляем старое сообщение если оно есть и еще существует
            if hasattr(self, '_msg_label'):
                try:
                    if self._msg_label.winfo_exists():
                        self._msg_label.destroy()
                except:
                    pass
            
            # Проверяем, существует ли корневое окно
            if not self.root or not self.root.winfo_exists():
                return
                
            x = self.root.winfo_width() - 250
            if hasattr(self, 'sidebar_open') and self.sidebar_open:
                x = 160
            
            self._msg_label = tk.Label(self.root, text=f"⚠️ {text}", font=("Arial", 11, "bold"),
                                       bg=color, fg="white", padx=12, pady=6)
            self._msg_label.place(x=x, y=70, anchor="ne")
            
            # Устанавливаем таймер удаления
            def remove_message():
                if hasattr(self, '_msg_label'):
                    try:
                        if self._msg_label.winfo_exists():
                            self._msg_label.destroy()
                    except:
                        pass
            
            self.root.after(duration, remove_message)
        except tk.TclError:
            # Если окно уже закрыто, игнорируем
            pass
# ================ БОКОВОЕ МЕНЮ С УМЕНИЯМИ ================
    def update_sidebar_stats(self):
        """Обновить статистики в боковом меню"""
        if not (self.sidebar_open and self.sidebar_frame and self.sidebar_frame.winfo_exists()):
            return
        
        if 'hp_value' in self.sidebar_widgets and self.sidebar_widgets['hp_value'].winfo_exists():
            self.sidebar_widgets['hp_value'].config(
                text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
            )
        
        if 'mp_value' in self.sidebar_widgets and self.sidebar_widgets['mp_value'].winfo_exists():
            self.sidebar_widgets['mp_value'].config(
                text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
            )
        
        stats = self.calculate_stats()
        if 'dmg_value' in self.sidebar_widgets and self.sidebar_widgets['dmg_value'].winfo_exists():
            self.sidebar_widgets['dmg_value'].config(text=str(stats["damage"]))
        
        if 'armor_value' in self.sidebar_widgets and self.sidebar_widgets['armor_value'].winfo_exists():
            self.sidebar_widgets['armor_value'].config(text=str(stats["armor"]))

    def create_hamburger_button(self):
        """Создать кнопку гамбургера для открытия бокового меню"""
        # Удаляем старую кнопку если есть
        if hasattr(self, 'hamburger_btn') and self.hamburger_btn and self.hamburger_btn.winfo_exists():
            self.hamburger_btn.destroy()
        
        # Кнопка вверху слева
        self.hamburger_btn = tk.Button(self.root, text="☰", font=("Arial", 16, "bold"),
                                       bg="#4A154B", fg="white", width=3, height=1,
                                       command=self.toggle_sidebar, 
                                       relief="raised", bd=2)
        self.hamburger_btn.place(x=10, y=10)  # Сверху слева
    
    def toggle_sidebar(self):
        """ЕДИНСТВЕННЫЙ метод для переключения бокового меню"""
        print(f"🔘 Нажата кнопка бокового меню, sidebar_open={self.sidebar_open}")
        
        if self.battle_active:
            print("⚠️ Бой активен, боковое меню отключено")
            self.notification.show_notification("Боковое меню отключено во время боя", "warning", 2000)
            return
        
        # Если анимация уже идет - ничего не делаем
        if hasattr(self, '_sidebar_animating') and self._sidebar_animating:
            print("⚠️ Анимация уже выполняется, пропускаем")
            return
        
        if not self.sidebar_open:
            self.show_sidebar()
        else:
            self.hide_sidebar()
    
    def show_sidebar(self):
        """Показать боковое меню"""
        print("▶️ Показываем боковое меню")
        
        # Если уже открыто - ничего не делаем
        if self.sidebar_open:
            return
        
        # Если анимация уже идет - ничего не делаем
        if hasattr(self, '_sidebar_animating') and self._sidebar_animating:
            return
        
        # Устанавливаем флаги
        self._sidebar_animating = True
        self.sidebar_open = True
        
        # Обновляем кнопку
        if self.hamburger_btn and self.hamburger_btn.winfo_exists():
            self.hamburger_btn.config(text="✕", state="disabled")
        
        # Получаем размеры окна
        window_height = self.root.winfo_height()
        
        # Создаем боковое меню (изначально за экраном слева)
        self.sidebar_frame = tk.Frame(self.root, bg="#222", width=240, height=window_height,
                                     relief="solid", bd=2)
        self.sidebar_frame.place(x=-240, y=0)
        self.sidebar_frame.pack_propagate(False)
        
        # Создаем содержимое бокового меню
        self.create_sidebar_content()
        
        print("✅ Создано боковое меню, начинаем плавную анимацию")
        # Запускаем анимацию
        self._animate_sidebar_open(current_x=-240)
    
    def hide_sidebar(self):
        """Скрыть боковое меню"""
        print("◀️ Скрываем боковое меню")
        
        # Если уже закрыто - ничего не делаем
        if not self.sidebar_open:
            return
        
        # Если анимация уже идет - ничего не делаем
        if hasattr(self, '_sidebar_animating') and self._sidebar_animating:
            return
        
        # Устанавливаем флаг анимации
        self._sidebar_animating = True
        
        # Обновляем кнопку
        if self.hamburger_btn and self.hamburger_btn.winfo_exists():
            self.hamburger_btn.config(text="☰", state="disabled")
        
        # Запускаем анимацию закрытия
        self._animate_sidebar_close(current_x=0)
    
    def _animate_sidebar_open(self, current_x):
        """Внутренний метод: анимация открытия"""
        if not hasattr(self, 'sidebar_frame') or not self.sidebar_frame:
            self._sidebar_animating = False
            return
        
        if not self.sidebar_frame.winfo_exists():
            self._sidebar_animating = False
            return
        
        step_size = 20
        new_x = current_x + step_size
        
        if new_x >= 0:
            # Достигли цели
            self.sidebar_frame.place(x=0)
            
            # Восстанавливаем кнопку
            if self.hamburger_btn and self.hamburger_btn.winfo_exists():
                self.hamburger_btn.config(state="normal")
            
            self._sidebar_animating = False
            print("✅ Анимация открытия завершена")
        else:
            # Продолжаем анимацию
            self.sidebar_frame.place(x=new_x)
            self.root.after(10, lambda: self._animate_sidebar_open(new_x))
    
    def _animate_sidebar_close(self, current_x):
        """Внутренний метод: анимация закрытия"""
        if not hasattr(self, 'sidebar_frame') or not self.sidebar_frame:
            self._sidebar_animating = False
            self.sidebar_open = False
            return
        
        if not self.sidebar_frame.winfo_exists():
            self._sidebar_animating = False
            self.sidebar_open = False
            return
        
        step_size = 20
        new_x = current_x - step_size
        
        if new_x <= -240:
            # Достигли цели
            self.sidebar_frame.place(x=-240)
            
            # Уничтожаем фрейм после небольшой задержки
            self.root.after(10, self._destroy_sidebar_frame)
            
            print("✅ Анимация закрытия завершена")
        else:
            # Продолжаем анимацию
            self.sidebar_frame.place(x=new_x)
            self.root.after(10, lambda: self._animate_sidebar_close(new_x))
    
    def _destroy_sidebar_frame(self):
        """Безопасно уничтожить фрейм бокового меню"""
        if hasattr(self, 'sidebar_frame') and self.sidebar_frame:
            try:
                if self.sidebar_frame.winfo_exists():
                    self.sidebar_frame.destroy()
            except:
                pass
            self.sidebar_frame = None
            self.sidebar_widgets = {}
        
        # Сбрасываем флаги
        self.sidebar_open = False
        self._sidebar_animating = False
        
        # Восстанавливаем кнопку
        if self.hamburger_btn and self.hamburger_btn.winfo_exists():
            self.hamburger_btn.config(state="normal")
        
        print("🗑️ Фрейм бокового меню уничтожен")

    def return_to_location(self):
        """Вернуться в текущую локацию"""
        self.hide_sidebar()
        saved_location = self.player_data.get("current_location", "Главная")
        
        if saved_location == "Главная":
            self.show_main_menu()
        else:
            self.current_screen = "location"
            self.current_location = saved_location
            self.show_location(saved_location)

    def create_sidebar_content(self):
        """Создать содержимое бокового меню (оставить как есть)"""
        # ВАШ СУЩЕСТВУЮЩИЙ КОД create_sidebar_content() ОСТАЕТСЯ БЕЗ ИЗМЕНЕНИЙ
        # Просто замените вызовы hide_sidebar_simple() на hide_sidebar()
        
        if not self.sidebar_frame:
            return
        
        self.sidebar_widgets = {}
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(self.sidebar_frame, bg="#222")
        main_container.pack(fill="both", expand=True, padx=2, pady=2)
        
        # Canvas для прокрутки
        canvas = tk.Canvas(main_container, bg="#222", highlightthickness=0, width=218)
        
        # Создаем стилизованный скроллбар
        style = ttk.Style()
        style.theme_use('default')
        
        style.configure("Purple.Vertical.TScrollbar",
                       troughcolor='#333333',
                       background='#6A1B9A',
                       bordercolor='#4A154B',
                       lightcolor='#6A1B9A',
                       darkcolor='#6A1B9A',
                       arrowcolor='#FFFFFF',
                       width=16,
                       relief='raised',
                       borderwidth=2,
                       arrowsize=12)
        
        style.map("Purple.Vertical.TScrollbar",
                 background=[('active', '#8E24AA'), ('pressed', '#4A154B')],
                 arrowcolor=[('active', '#FFD700'), ('pressed', '#FFD700')])
        
        scrollbar = ttk.Scrollbar(main_container, orient="vertical", 
                                 command=canvas.yview, style="Purple.Vertical.TScrollbar")
        
        scrollable_frame = tk.Frame(canvas, bg="#222")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=(0, 2))
        scrollbar.pack(side="right", fill="y", padx=(0, 2), pady=2)
        
        # Заголовок с индикатором админа/игрока
        header_frame = tk.Frame(scrollable_frame, bg="#4A154B", height=55)
        header_frame.pack(fill="x", pady=(0, 6))
        
        # Центрируем содержимое заголовка
        header_content = tk.Frame(header_frame, bg="#4A154B")
        header_content.place(relx=0.5, rely=0.5, anchor="center")
        
        # Индикатор администратора/игрока
        admin_text = "👑 АДМИН" if self.is_admin() else "👤 ИГРОК"
        admin_color = "#FFD700" if self.is_admin() else "#FFFFFF"
        admin_indicator = tk.Label(header_content, 
                                  text=admin_text,
                                  font=("Arial", 12, "bold"),
                                  bg="#4A154B", 
                                  fg=admin_color,
                                  padx=10, pady=4)
        admin_indicator.pack(side="left", padx=(0, 12))
        
        # Кнопка закрытия - ИЗМЕНЕНО: вызываем hide_sidebar()
        close_btn = tk.Button(header_content, text="✕", font=("Arial", 15, "bold"),
                            bg="#6A1B9A", fg="white", width=2, height=1,
                            command=self.hide_sidebar, 
                            relief="raised", bd=2,
                            activebackground="#8E24AA",
                            activeforeground="white")
        close_btn.pack(side="left")
        
        # Центрируем все остальное содержимое
        content_center = tk.Frame(scrollable_frame, bg="#222")
        content_center.pack(fill="both", expand=True, padx=13)
        
        # 1. HP (карточка)
        hp_card = tk.Frame(content_center, bg="#D32F2F", relief="ridge", bd=2)
        hp_card.pack(fill="x", pady=5)
        
        hp_inner = tk.Frame(hp_card, bg="#D32F2F", padx=13, pady=7)
        hp_inner.pack(fill="x")
        
        tk.Label(hp_inner, text="❤️ HP", font=("Arial", 11, "bold"),
                bg="#D32F2F", fg="white").pack(side="left")
        
        hp_value = tk.Label(hp_inner, 
                text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}",
                font=("Arial", 11, "bold"), bg="#D32F2F", fg="white")
        hp_value.pack(side="right")
        self.sidebar_widgets['hp_value'] = hp_value
        
        # 2. MP (карточка)
        mp_card = tk.Frame(content_center, bg="#1976D2", relief="ridge", bd=2)
        mp_card.pack(fill="x", pady=5)
        
        mp_inner = tk.Frame(mp_card, bg="#1976D2", padx=13, pady=7)
        mp_inner.pack(fill="x")
        
        tk.Label(mp_inner, text="💙 MP", font=("Arial", 11, "bold"),
                bg="#1976D2", fg="white").pack(side="left")
        
        mp_value = tk.Label(mp_inner,
                text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}",
                font=("Arial", 11, "bold"), bg="#1976D2", fg="white")
        mp_value.pack(side="right")
        self.sidebar_widgets['mp_value'] = mp_value
        
        # Разделитель
        separator = tk.Frame(content_center, bg="#555", height=1)
        separator.pack(fill="x", pady=7)
        
        # 3. Информация о персонаже
        info_card = tk.Frame(content_center, bg="#333", relief="ridge", bd=2, padx=13, pady=9)
        info_card.pack(fill="x", pady=5)
        
        # Имя
        name_frame = tk.Frame(info_card, bg="#333")
        name_frame.pack(fill="x", pady=3)
        
        tk.Label(name_frame, text="👤 Имя:", font=("Arial", 10, "bold"),
                bg="#333", fg="gold", width=7, anchor="w").pack(side="left")
        
        name_text = self.player_data.get("name", "Герой")
        if len(name_text) > 12:
            name_text = name_text[:12] + "..."
        
        tk.Label(name_frame, text=name_text, font=("Arial", 10),
                bg="#333", fg="white").pack(side="right")
        
        # Класс
        class_frame = tk.Frame(info_card, bg="#333")
        class_frame.pack(fill="x", pady=3)
        
        tk.Label(class_frame, text="🎭 Класс:", font=("Arial", 10, "bold"),
                bg="#333", fg="white", width=7, anchor="w").pack(side="left")
        
        class_name = self.player_data.get("class", "Воин")
        class_color = {
            "Воин": "#C62828",
            "Маг": "#7B1FA2",
            "Охотник": "#388E3C"
        }.get(class_name, "#757575")
        
        tk.Label(class_frame, text=class_name, font=("Arial", 10, "bold"),
                bg="#333", fg=class_color).pack(side="right")
        
        # Разделитель
        separator2 = tk.Frame(content_center, bg="#555", height=1)
        separator2.pack(fill="x", pady=7)
        
        # 4. Боевые характеристики
        stats_card = tk.Frame(content_center, bg="#444", relief="ridge", bd=2, padx=13, pady=9)
        stats_card.pack(fill="x", pady=5)
        
        tk.Label(stats_card, text="⚔️ Характеристики", font=("Arial", 11, "bold"),
                bg="#444", fg="#FFD700").pack(anchor="w", pady=(0, 7))
        
        stats = self.calculate_stats()
        
        # Урон
        dmg_frame = tk.Frame(stats_card, bg="#444")
        dmg_frame.pack(fill="x", pady=3)
        
        tk.Label(dmg_frame, text="Урон:", font=("Arial", 10),
                bg="#444", fg="white", width=6, anchor="w").pack(side="left")
        
        dmg_value = tk.Label(dmg_frame, text=str(stats["damage"]), font=("Arial", 10, "bold"),
                bg="#444", fg="#FF5252")
        dmg_value.pack(side="right")
        self.sidebar_widgets['dmg_value'] = dmg_value
        
        # Броня
        armor_frame = tk.Frame(stats_card, bg="#444")
        armor_frame.pack(fill="x", pady=3)
        
        tk.Label(armor_frame, text="Броня:", font=("Arial", 10),
                bg="#444", fg="white", width=6, anchor="w").pack(side="left")
        
        armor_value = tk.Label(armor_frame, text=str(stats["armor"]), font=("Arial", 10, "bold"),
                bg="#444", fg="#4CAF50")
        armor_value.pack(side="right")
        self.sidebar_widgets['armor_value'] = armor_value
        
        # Разделитель
        separator3 = tk.Frame(content_center, bg="#555", height=1)
        separator3.pack(fill="x", pady=7)
        
        # 5. Уровень и опыт
        level_card = tk.Frame(content_center, bg="#333", relief="ridge", bd=2, padx=13, pady=9)
        level_card.pack(fill="x", pady=5)
        
        # Создаем контейнер для виджета уровня
        level_widget_container = tk.Frame(level_card, bg="#333")
        level_widget_container.pack(fill="x")
        
        if not hasattr(self, 'level_widgets'):
            self.level_widgets = {}
        self.level_widgets['sidebar'] = level_widget_container
        
        # Инициализируем виджет
        self.refresh_level_widget(level_widget_container)
        
        # Разделитель
        separator4 = tk.Frame(content_center, bg="#555", height=1)
        separator4.pack(fill="x", pady=7)
        
        # 6. Кнопки навигации
        buttons_frame = tk.Frame(content_center, bg="#222")
        buttons_frame.pack(fill="x", pady=4)
        
        # Стиль для кнопок
        btn_width = 17
        btn_height = 1
        btn_font = ("Arial", 11, "bold")
        
        # Персонаж - ИЗМЕНЕНО: вызываем hide_sidebar()
        char_btn = tk.Button(buttons_frame, text="👤 Персонаж", font=btn_font,
                          bg="#9C27B0", fg="white", width=btn_width, height=btn_height,
                          command=lambda: [self.hide_sidebar(), self.show_character()], 
                          relief="raised", bd=2)
        char_btn.pack(pady=4, padx=12)
        
        # Умения - ИЗМЕНЕНО: вызываем hide_sidebar()
        abilities_btn = tk.Button(buttons_frame, text="✨ Умения", font=btn_font,
                                bg="#FF9800", fg="white", width=btn_width, height=btn_height,
                                command=lambda: [self.hide_sidebar(), self.show_abilities()], 
                                relief="raised", bd=2)
        abilities_btn.pack(pady=4, padx=12)
        
        # Сумка - ИЗМЕНЕНО: вызываем hide_sidebar()
        inv_btn = tk.Button(buttons_frame, text="🎒 Сумка", font=btn_font,
                          bg="#FF9800", fg="white", width=btn_width, height=btn_height,
                          command=lambda: [self.hide_sidebar(), self.show_inventory()], 
                          relief="raised", bd=2)
        inv_btn.pack(pady=4, padx=12)
        
        # Локация - ИЗМЕНЕНО: вызываем hide_sidebar()
        loc_btn = tk.Button(buttons_frame, text="📍 Локация", font=btn_font,
                          bg="#2196F3", fg="white", width=btn_width, height=btn_height,
                          command=lambda: [self.hide_sidebar(), self.return_to_location()], 
                          relief="raised", bd=2)
        loc_btn.pack(pady=4, padx=12)
        
        # Редактор для администратора - ИЗМЕНЕНО: вызываем hide_sidebar()
        if self.is_admin():
            editor_btn = tk.Button(buttons_frame, text="🛠 Редактор", font=btn_font,
                                bg="#4CAF50", fg="white", width=btn_width, height=btn_height,
                                command=lambda: [self.hide_sidebar(), self.open_contextual_editor()], 
                                relief="raised", bd=2)
            editor_btn.pack(pady=4, padx=12)
        
        # Редактор монстров для администратора - ИЗМЕНЕНО: вызываем hide_sidebar()
        if self.is_admin():
            monsters_editor_btn = tk.Button(buttons_frame, text="👹 Монстры", 
                                          font=btn_font,
                                          bg="#9C27B0", fg="white", width=btn_width, height=btn_height,
                                          command=lambda: [self.hide_sidebar(), 
                                                         self.open_monsters_editor(self.current_location)], 
                                          relief="raised", bd=2)
            monsters_editor_btn.pack(pady=4, padx=12)
        
        # Выход - ИЗМЕНЕНО: вызываем hide_sidebar()
        logout_btn = tk.Button(buttons_frame, text="🚪 Выйти", font=btn_font,
                             bg="#f44336", fg="white", width=btn_width, height=btn_height,
                             command=lambda: [self.hide_sidebar(), self.logout()], 
                          relief="raised", bd=2)
        logout_btn.pack(pady=4, padx=12)
        
        # Поддержка прокрутки колесиком мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Обновляем область прокрутки
        canvas.update_idletasks()
        canvas.config(scrollregion=canvas.bbox("all"))
        
        # Добавляем отступ снизу
        tk.Frame(scrollable_frame, bg="#222", height=10).pack()
    # ================ ЯМА С ЛУТОМ (ИНДИВИДУАЛЬНАЯ ДЛЯ КАЖДОГО ИГРОКА) ================
    def show_loot_pile(self, location):
        """Отображение ямы с лутом в локации"""
        if self.loot_pile_frame and self.loot_pile_frame.winfo_exists():
            self.loot_pile_frame.destroy()
        
        loc_cfg = self.config["locations"].get(location, {})
        loot_pile_cfg = loc_cfg.get("loot_pile", {})
        
        if not loot_pile_cfg.get("visible", True):
            return
        
        # Загружаем предметы из ямы для текущего игрока в этой локации
        self.loot_pile_items = self.get_player_loot_pile(location)
        
        x = loot_pile_cfg.get("x", 20)
        y = loot_pile_cfg.get("y", 350)
        width = loot_pile_cfg.get("width", 200)
        height = loot_pile_cfg.get("height", 120)
        bg_color = loot_pile_cfg.get("bg_color", "#8B4513")
        fg_color = loot_pile_cfg.get("fg_color", "#FFFFFF")
        
        self.loot_pile_frame = tk.Frame(self.root, bg=bg_color, relief="ridge", bd=3)
        self.loot_pile_frame.place(x=x, y=y, width=width, height=height)
        
        # Заголовок ямы
        title_frame = tk.Frame(self.loot_pile_frame, bg=bg_color, height=30)
        title_frame.pack(fill="x")
        
        tk.Label(title_frame, text="🕳️ Яма", font=("Arial", 11, "bold"),
                bg=bg_color, fg=fg_color).pack(side="left", padx=5, pady=3)
        
        # Количество предметов
        item_count = len(self.loot_pile_items)
        tk.Label(title_frame, text=f"({item_count})", font=("Arial", 10),
                bg=bg_color, fg=fg_color).pack(side="right", padx=5, pady=3)
        
        # Контейнер для отображения предметов с прокруткой
        content_container = tk.Frame(self.loot_pile_frame, bg=bg_color)
        content_container.pack(fill="both", expand=True, padx=5, pady=5)
        
        if item_count == 0:
            tk.Label(content_container, text="Пусто", font=("Arial", 10),
                    bg=bg_color, fg=fg_color).place(relx=0.5, rely=0.5, anchor="center")
        else:
            # Создаем Canvas и Scrollbar для прокрутки предметов
            canvas = tk.Canvas(content_container, bg=bg_color, highlightthickness=0)
            scrollbar = tk.Scrollbar(content_container, orient="vertical", command=canvas.yview)
            items_frame = tk.Frame(canvas, bg=bg_color)  # Фрейм для предметов
            
            # Привязываем конфигурацию прокрутки
            def configure_scrollregion(event):
                canvas.configure(scrollregion=canvas.bbox("all"))
            
            items_frame.bind("<Configure>", configure_scrollregion)
            canvas.create_window((0, 0), window=items_frame, anchor="nw")
            canvas.configure(yscrollcommand=scrollbar.set)
            
            canvas.pack(side="left", fill="both", expand=True)
            scrollbar.pack(side="right", fill="y")
            
            # Устанавливаем фиксированную высоту для canvas
            canvas.config(height=min(60, len(self.loot_pile_items) * 22))
            
            # Показываем все предметы в яме с прокруткой
            for i, item_data in enumerate(self.loot_pile_items):
                item_frame = tk.Frame(items_frame, bg=bg_color)
                item_frame.pack(fill="x", pady=2)
                
                item_name = item_data.get("name", "Предмет")
                if len(item_name) > 12:
                    item_name = item_name[:12] + "..."
                
                tk.Label(item_frame, text=item_data.get("icon", "📦"), 
                        font=("Arial", 12), bg=bg_color, fg=fg_color).pack(side="left", padx=(0, 5))
                tk.Label(item_frame, text=item_name, font=("Arial", 9),
                        bg=bg_color, fg=fg_color, width=15, anchor="w").pack(side="left")
            
            # Вызываем обновление области прокрутки
            canvas.update_idletasks()
            canvas.configure(scrollregion=canvas.bbox("all"))
        
        # Кнопка открытия ямы - всегда внизу
        btn_frame = tk.Frame(self.loot_pile_frame, bg=bg_color)
        btn_frame.pack(fill="x", pady=(0, 5))
        
        if item_count > 0:
            tk.Button(btn_frame, text="📦 Открыть", font=("Arial", 9, "bold"),
                     bg="#FF9800", fg="white", width=12,
                     command=lambda: self.open_loot_pile_dialog(location)).pack()
        else:
            tk.Button(btn_frame, text="📦 Открыть", font=("Arial", 9),
                     bg="#9E9E9E", fg="white", width=12,
                     state="disabled").pack()

    def get_player_loot_pile(self, location):
        """Получить яму с лутом для текущего игрока в указанной локации"""
        if not self.player_data:
            return []
        
        username = self.player_data.get("username")
        if not username:
            return []
        
        # Создаем уникальный ключ для ямы игрока в локации
        loot_key = f"loot_pile_{username}_{location}"
        
        # Загружаем конфигурацию локации
        loc_cfg = self.config["locations"].get(location, {})
        loot_pile_cfg = loc_cfg.get("loot_pile", {})
        
        # Проверяем, есть ли уже яма для этого игрока
        if "player_loot_piles" not in loot_pile_cfg:
            loot_pile_cfg["player_loot_piles"] = {}
        
        player_loot_piles = loot_pile_cfg["player_loot_piles"]
        
        # Если у игрока еще нет ямы в этой локации, создаем пустую
        if loot_key not in player_loot_piles:
            player_loot_piles[loot_key] = []
            # Сохраняем изменения в конфиг
            loc_cfg["loot_pile"] = loot_pile_cfg
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
        
        return player_loot_piles[loot_key]

    def save_player_loot_pile(self, location, items):
        """Сохранить яму с лутом для текущего игрока в указанной локации"""
        if not self.player_data:
            return
        
        username = self.player_data.get("username")
        if not username:
            return
        
        # Создаем уникальный ключ для ямы игрока в локации
        loot_key = f"loot_pile_{username}_{location}"
        
        # Загружаем конфигурацию локации
        loc_cfg = self.config["locations"].get(location, {})
        loot_pile_cfg = loc_cfg.get("loot_pile", {})
        
        # Инициализируем словарь ям игроков, если его нет
        if "player_loot_piles" not in loot_pile_cfg:
            loot_pile_cfg["player_loot_piles"] = {}
        
        # Сохраняем предметы для текущего игрока
        loot_pile_cfg["player_loot_piles"][loot_key] = items
        
        # Обновляем конфигурацию и сохраняем
        loc_cfg["loot_pile"] = loot_pile_cfg
        self.config["locations"][location] = loc_cfg
        save_config(self.config)

    def open_loot_pile_dialog(self, location):
        """Открыть диалог с содержимым ямы"""
        dialog = tk.Toplevel(self.root)
        dialog.title(f"🕳️ Яма - {location}")
        dialog.geometry("500x450")
        dialog.configure(bg="#5D4037")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#3E2723", height=50)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text=f"🕳️ Яма с лутом", font=("Arial", 14, "bold"),
                bg="#3E2723", fg="white").pack(pady=10)
        
        # Информация о локации
        info_frame = tk.Frame(dialog, bg="#6D4C41", padx=10, pady=5)
        info_frame.pack(fill="x", padx=10, pady=5)
        
        loc_cfg = self.config["locations"].get(location, {})
        loot_pile_cfg = loc_cfg.get("loot_pile", {})
        self.loot_pile_items = self.get_player_loot_pile(location)
        
        tk.Label(info_frame, text=f"Локация: {loc_cfg.get('title', location)}", 
                font=("Arial", 10, "bold"), bg="#6D4C41", fg="white").pack(side="left")
        
        item_count = len(self.loot_pile_items)
        tk.Label(info_frame, text=f"Предметов: {item_count}", 
                font=("Arial", 10, "bold"), bg="#6D4C41", fg="#FFD54F").pack(side="right")
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#5D4037")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#5D4037", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#5D4037")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        if item_count == 0:
            empty_frame = tk.Frame(scrollable_frame, bg="#5D4037", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="🕳️", font=("Arial", 40), 
                    bg="#5D4037", fg="#A1887F").pack(pady=10)
            tk.Label(empty_frame, text="Яма пуста", font=("Arial", 14, "bold"), 
                    bg="#5D4037", fg="white").pack(pady=5)
            tk.Label(empty_frame, text="Победите монстров, чтобы получить лут", 
                    font=("Arial", 9), bg="#5D4037", fg="#BCAAA4").pack()
        else:
            # Создаем фрейм для карточек предметов
            items_container = tk.Frame(scrollable_frame, bg="#5D4037")
            items_container.pack(fill="both", expand=True)
            
            for i, item_data in enumerate(self.loot_pile_items):
                item_card = tk.Frame(items_container, bg="#8D6E63", relief="raised", bd=2, padx=10, pady=10)
                item_card.pack(fill="x", pady=5)
                
                # Левая часть - иконка и информация
                left_frame = tk.Frame(item_card, bg="#8D6E63")
                left_frame.pack(side="left", fill="both", expand=True)
                
                # Иконка и название
                top_frame = tk.Frame(left_frame, bg="#8D6E63")
                top_frame.pack(fill="x", pady=(0, 5))
                
                tk.Label(top_frame, text=item_data.get("icon", "📦"), font=("Arial", 20), 
                        bg="#8D6E63", fg="white").pack(side="left", padx=(0, 10))
                
                name_frame = tk.Frame(top_frame, bg="#8D6E63")
                name_frame.pack(side="left", fill="both", expand=True)
                
                item_name = item_data.get("name", "Предмет")
                tk.Label(name_frame, text=item_name, font=("Arial", 11, "bold"), 
                        bg="#8D6E63", fg="white").pack(anchor="w")
                
                # Базовая информация о предмете
                base_item_id = item_data.get("base_item_id", "")
                items_db = self.load_static_items()
                base_item = items_db.get(base_item_id, {})
                
                # Тип предмета
                item_type = item_data.get("type", base_item.get("type", "unknown"))
                type_colors = {
                    "weapon": "#D32F2F",
                    "armor": "#388E3C",
                    "consumable": "#7B1FA2"
                }
                type_color = type_colors.get(item_type, "#757575")
                
                type_frame = tk.Frame(left_frame, bg="#8D6E63")
                type_frame.pack(fill="x", pady=2)
                
                if item_type == "weapon":
                    tk.Label(type_frame, text="⚔️ Оружие", font=("Arial", 9, "bold"),
                            bg=type_color, fg="white", padx=5, pady=1).pack(side="left", padx=(0, 5))
                    tk.Label(type_frame, text=f"Урон: {item_data.get('damage', 0)}", 
                            font=("Arial", 9), bg="#8D6E63", fg="#FFCDD2").pack(side="left", padx=(0, 10))
                elif item_type == "armor":
                    tk.Label(type_frame, text="🛡️ Броня", font=("Arial", 9, "bold"),
                            bg=type_color, fg="white", padx=5, pady=1).pack(side="left", padx=(0, 5))
                    tk.Label(type_frame, text=f"Защита: {item_data.get('defense', 0)}", 
                            font=("Arial", 9), bg="#8D6E63", fg="#C8E6C9").pack(side="left", padx=(0, 10))
                elif item_type == "consumable":
                    tk.Label(type_frame, text="🧪 Расходник", font=("Arial", 9, "bold"),
                            bg=type_color, fg="white", padx=5, pady=1).pack(side="left", padx=(0, 5))
                    tk.Label(type_frame, text=f"Эффект: +{item_data.get('value', 0)} HP", 
                            font=("Arial", 9), bg="#8D6E63", fg="#E1BEE7").pack(side="left", padx=(0, 10))
                
                # Вес и требование класса
                stats_frame = tk.Frame(left_frame, bg="#8D6E63")
                stats_frame.pack(fill="x", pady=(5, 0))
                
                tk.Label(stats_frame, text=f"⚖️ Вес: {item_data.get('weight', 0)}", 
                        font=("Arial", 8), bg="#8D6E63", fg="#FFECB3").pack(side="left", padx=(0, 10))
                
                if item_data.get("class_requirement"):
                    req_color = "#4CAF50" if item_data.get("class_requirement") == self.player_data.get("class") else "#f44336"
                    tk.Label(stats_frame, text=f"🎭 {item_data.get('class_requirement')}", 
                            font=("Arial", 8, "bold"), bg=req_color, fg="white", 
                            padx=3, pady=1).pack(side="left")
                
                # Правая часть - кнопки
                btn_frame = tk.Frame(item_card, bg="#8D6E63")
                btn_frame.pack(side="right")
                
                # ИСПРАВЛЕНО: используем полный вес инвентаря для проверки
                current_bag_weight = self.calculate_full_inventory_weight()
                item_weight = item_data.get("weight", 0)
                bag_capacity = self.get_current_bag_capacity()
                can_take = current_bag_weight + item_weight <= bag_capacity
                
                # Кнопка взять
                take_btn = tk.Button(btn_frame, text="📥 Взять", font=("Arial", 9, "bold"),
                                   bg="#4CAF50" if can_take else "#757575", 
                                   fg="white", width=8,
                                   command=lambda idx=i, loc=location: self.take_from_loot_pile(idx, loc, dialog),
                                   state="normal" if can_take else "disabled")
                take_btn.pack(pady=2)
                
                # Кнопка выбросить
                tk.Button(btn_frame, text="🗑 Выбросить", font=("Arial", 9, "bold"),
                         bg="#f44336", fg="white", width=8,
                         command=lambda idx=i, loc=location: self.discard_from_loot_pile(idx, loc, dialog)).pack(pady=2)
        
        # Кнопка закрытия
        btn_container = tk.Frame(dialog, bg="#5D4037", pady=10)
        btn_container.pack(fill="x", padx=10)
        
        tk.Button(btn_container, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=dialog.destroy).pack()
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')

    def take_from_loot_pile(self, item_index, location, dialog):
        """Взять предмет из ямы"""
        items = self.get_player_loot_pile(location)
        
        if item_index >= len(items):
            self.notification.show_notification("Предмет не найден", "error", 3000)
            return
        
        item_data = items[item_index]
        item_weight = item_data.get("weight", 0)
        
        # ИСПРАВЛЕНО: используем полный вес инвентаря (включая экипированные предметы)
        current_bag_weight = self.calculate_full_inventory_weight()
        bag_capacity = self.get_current_bag_capacity()
        
        # Проверяем, достаточно ли места в инвентаре
        if current_bag_weight + item_weight > bag_capacity:
            self.notification.show_notification(
                f"Недостаточно места в сумке!\n"
                f"Требуется: {item_weight:.1f} кг\n"
                f"Свободно: {bag_capacity - current_bag_weight:.1f} кг",
                "warning", 
                3000
            )
            return
        
        # Добавляем предмет в инвентарь игрока
        self.player_data["inventory"].append(item_data)
        self.save_current_player()
        
        # Удаляем предмет из ямы игрока
        items.pop(item_index)
        self.save_player_loot_pile(location, items)
        
        # Обновляем отображение
        self.notification.show_notification(
            f"Предмет взят: {item_data.get('name', 'Предмет')}",
            "success",
            2000
        )
        dialog.destroy()
        self.show_loot_pile(location)
        self.refresh_current_view()

    def discard_from_loot_pile(self, item_index, location, dialog):
        """Выбросить предмет из ямы"""
        if messagebox.askyesno("🗑 Выбросить", "Вы уверены, что хотите выбросить этот предмет?", parent=dialog):
            items = self.get_player_loot_pile(location)
            
            if item_index >= len(items):
                messagebox.showerror("Ошибка", "Предмет не найден!", parent=dialog)
                return
            
            item_data = items[item_index]
            
            # Удаляем предмет из ямы игрока
            items.pop(item_index)
            self.save_player_loot_pile(location, items)
            
            self.show_animated_message(f"Предмет выброшен из ямы", "#f44336", 1500)
            dialog.destroy()
            self.show_loot_pile(location)

    def add_to_loot_pile(self, location, item_data):
        """Добавить предмет в яму текущего игрока"""
        items = self.get_player_loot_pile(location)
        
        # Проверяем, не превышен ли лимит предметов в яме (максимум 10)
        if len(items) >= 10:
            items.pop(0)
            self.notification.show_notification(
                "Яма переполнена! Старый предмет удалён.",
                "warning",
                2000
            )
        
        # Добавляем новый предмет
        items.append(item_data)
        self.save_player_loot_pile(location, items)
        
        self.notification.show_notification(
            f"Новый предмет в яме: {item_data.get('name', 'Предмет')}",
            "loot",
            2000
        )
        
        # Обновляем отображение ямы
        self.show_loot_pile(location)

    # ================ РЕГЕНЕРАЦИЯ HP/MP ================
    def start_regeneration(self):
        """Регенерация HP и MP"""
        if self.battle_active or self.editor_window:
            # Не регенерируем во время боя или в редакторе
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)
            return

        updated = False
        
        # Регенерация HP
        current_hp = self.player_data.get("hp", 0)
        max_hp = self.player_data.get("hp_max", 100)
        
        if current_hp < max_hp:
            self.player_data["hp"] += 1
            if self.player_data["hp"] > max_hp:
                self.player_data["hp"] = max_hp
            updated = True
            
            # Показываем уведомление только если здоровье почти полное
            if self.player_data["hp"] == max_hp:
                self.notification.show_notification("Здоровье полностью восстановлено!", "success", 2000)
            
            # Обновляем UI здоровья
            self.update_health_display()
            
            if self.sidebar_open:
                self.update_sidebar_stats()
                if self.sidebar_frame and self.sidebar_frame.winfo_exists():
                    self.animate_gain(self.sidebar_frame, 120, 45, "+1", "#FF5252")

        # Регенерация MP
        current_mp = self.player_data.get("mp", 0)
        max_mp = self.player_data.get("mp_max", 20)
        
        if current_mp < max_mp:
            self.player_data["mp"] += 1
            if self.player_data["mp"] > max_mp:
                self.player_data["mp"] = max_mp
            updated = True
            
            # Обновляем UI маны
            self.update_mana_display()
            
            if self.sidebar_open:
                self.update_sidebar_stats()
                if self.sidebar_frame and self.sidebar_frame.winfo_exists():
                    self.animate_gain(self.sidebar_frame, 120, 85, "+1", "#448AFF")

        if updated:
            self.save_current_player()

        # Планируем следующую регенерацию
        self.regeneration_timer = self.root.after(2000, self.start_regeneration)

    def update_health_display(self):
        """Обновить отображение здоровья"""
        # Обновляем в боковом меню
        if self.sidebar_open and 'hp_value' in self.sidebar_widgets:
            self.sidebar_widgets['hp_value'].config(
                text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
            )
        
        # Обновляем в интерфейсе персонажа
        if hasattr(self, 'player_hp_label') and self.player_hp_label and self.player_hp_label.winfo_exists():
            self.player_hp_label.config(
                text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
            )
        
        # Обновляем в бою
        if self.battle_active and hasattr(self, 'player_hp_label'):
            if self.player_hp_label and self.player_hp_label.winfo_exists():
                self.player_hp_label.config(
                    text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
                )

    def update_mana_display(self):
        """Обновить отображение маны"""
        # Обновляем в боковом меню
        if self.sidebar_open and 'mp_value' in self.sidebar_widgets:
            self.sidebar_widgets['mp_value'].config(
                text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
            )
        
        # Обновляем в интерфейсе персонажа
        if hasattr(self, 'player_mp_label') and self.player_mp_label and self.player_mp_label.winfo_exists():
            self.player_mp_label.config(
                text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
            )
        
        # Обновляем в бою
        if self.battle_active and hasattr(self, 'player_mp_label'):
            if self.player_mp_label and self.player_mp_label.winfo_exists():
                self.player_mp_label.config(
                    text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
                )

    # ================ СИСТЕМА МОНСТРОВ ================
    def show_monsters_in_location(self, location):
        """Показать всех монстров в локации"""
        print(f"🔍 Отображение монстров в локации: {location}")
        
        # Удаляем старые фреймы
        if hasattr(self, 'monster_frames'):
            for monster_key, frame_data in self.monster_frames.items():
                frame = frame_data.get('frame')
                if frame and frame.winfo_exists():
                    frame.destroy()
            self.monster_frames = {}
        
        if hasattr(self, 'respawn_frames'):
            for monster_key, frame_data in self.respawn_frames.items():
                frame = frame_data.get('frame')
                if frame and frame.winfo_exists():
                    frame.destroy()
            self.respawn_frames = {}
        
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if not monsters_data or not isinstance(monsters_data, list):
            print(f"ℹ️ В локации {location} нет монстров")
            return
        
        bg_color = loc_cfg.get("monster_bg_color", "#FFFFFF")
        fg_color = loc_cfg.get("monster_fg_color", "#000000")
        
        now = time.time()
        need_save = False
        
        for i, monster_data in enumerate(monsters_data):
            # ДОБАВЬТЕ ЭТУ ОТЛАДКУ:
            print(f"📊 ДО обработки - Монстр {i}: respawn_time из конфига = {monster_data.get('respawn_time')}")
            
            monster = Monster.from_dict(monster_data)
            if not monster:
                print(f"⚠️ Не удалось создать монстра {i+1} из данных")
                continue
            
            # Проверяем ID
            if not hasattr(monster, 'id') or not monster.id:
                monster.id = monster.generate_id(monster.name)
                need_save = True
            
            print(f"🐺 Монстр {i+1} (ID: {monster.id}): {monster.name}, HP={monster.hp}/{monster.hp_max}, alive={monster.is_alive}, respawn_time={monster.respawn_time}")
            
            # Проверяем состояние монстра
            if not monster.is_alive:
                # Монстр мертв
                if monster.respawn_time is None:
                    # Устанавливаем время возрождения ТОЛЬКО ЕСЛИ ЕГО НЕТ
                    monster.respawn_time = now + monster.default_respawn_time
                    monsters_data[i] = monster.to_dict()
                    need_save = True
                    print(f"⏰ Установлен respawn_time для {monster.name}: {monster.respawn_time}")
                
                # Проверяем, не истекло ли время возрождения
                if monster.respawn_time is not None:
                    if monster.respawn_time <= now:
                        # Время возрождения истекло - воскрешаем
                        print(f"🎉 Время возрождения истекло, воскрешаем монстра {monster.name}")
                        self.respawn_specific_monster_by_id(location, monster.id)
                        # Прерываем текущую итерацию
                        continue
                    else:
                        # Показываем таймер
                        remaining = int(monster.respawn_time - now)
                        print(f"⚰️ Монстр {monster.name} мертв, возрождение через: {remaining}с (respawn_time={monster.respawn_time})")
                        self.show_respawn_timer_for_monster(location, monster, i, remaining, bg_color, fg_color)
                continue
            
            # Монстр жив
            if monster.hp <= 0:
                # Монстр должен быть мертв, но флаг is_alive=True
                print(f"⚠️ Монстр {monster.name} имеет HP={monster.hp}, но is_alive=True. Убиваем...")
                monster.is_alive = False
                monster.respawn_time = now + monster.default_respawn_time
                monsters_data[i] = monster.to_dict()
                need_save = True
                print(f"⏰ Установлен respawn_time для {monster.name}: {monster.respawn_time}")
                self.show_respawn_timer_for_monster(location, monster, i, monster.default_respawn_time, bg_color, fg_color)
                continue
            
            # Отображаем живого монстра
            print(f"✅ Монстр {monster.name} (ID: {monster.id}) жив, отображаем его")
            self.create_monster_frame(location, monster, i, bg_color, fg_color)
        
        # Сохраняем изменения если нужно
        if need_save:
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            print(f"💾 Сохранены изменения монстров в локации {location}")

    def create_monster_frame(self, location, monster, index, bg_color, fg_color):
        """Создать фрейм для одного монстра"""
        monster_key = f"{location}_monster_{monster.id}"
        
        # Создаем фрейм для монстра
        monster_frame = tk.Frame(self.root, bg=bg_color, relief="raised", bd=2)
        
        # Используем координаты монстра из конфига
        x = monster.x
        y = monster.y
        
        # ИСПОЛЬЗУЕМ РАЗМЕРЫ ИЗ МОНСТРА
        frame_width = monster.frame_width
        frame_height = monster.frame_height
        
        monster_frame.place(x=x, y=y, width=frame_width, height=frame_height)
        
        # Содержимое фрейма монстра
        tk.Label(monster_frame, text=monster.icon, font=("Arial", 24),
                 bg=bg_color, fg=fg_color).pack(pady=(5, 2))
        
        tk.Label(monster_frame, text=monster.name, font=("Arial", 12, "bold"),
                 bg=bg_color, fg=fg_color).pack()
        
        tk.Label(monster_frame, text=f"❤️ {monster.hp}/{monster.hp_max}",
                 font=("Arial", 10), bg=bg_color, fg=fg_color).pack()
        
        tk.Label(monster_frame, text=f"⭐ Опыт: {monster.exp_reward}",
                 font=("Arial", 9), bg=bg_color, fg="#FFD700").pack()
        
        attack_state = "normal" if monster.is_alive and monster.hp > 0 else "disabled"
        attack_bg = "#C62828" if monster.is_alive and monster.hp > 0 else "#757575"
        
        attack_btn = tk.Button(monster_frame, text="⚔️ Атаковать", font=("Arial", 10),
                  bg=attack_bg, fg="white", state=attack_state,
                  command=lambda m=monster, loc=location, idx=index: self.start_battle_with_monster(m, loc, idx))
        attack_btn.pack(pady=(5, 5))
        
        # Кнопка информации о луте
        info_btn = tk.Button(monster_frame, text="?", font=("Arial", 10, "bold"),
                    bg="#2196F3", fg="white", width=2, height=1,
                    command=lambda m=monster, loc=location: self.show_monster_loot_info(m, loc))
        info_btn.place(x=frame_width - 15, y=5, anchor="ne")
        
        # Сохраняем фрейм с его размерами
        if not hasattr(self, 'monster_frames'):
            self.monster_frames = {}
        self.monster_frames[monster_key] = {
            'frame': monster_frame,
            'width': frame_width,
            'height': frame_height,
            'x': x,
            'y': y
        }
    def show_respawn_timer_for_monster(self, location, monster, index, remaining_seconds, bg_color="#FFFFFF", fg_color="#000000"):
        """Показать таймер возрождения для конкретного монстра"""
        # ИСПРАВЛЕНО: используем ID монстра вместо индекса
        monster_key = f"{location}_monster_{monster.id}"
        
        # ИСПОЛЬЗУЕМ РАЗМЕРЫ ИЗ МОНСТРА
        frame_width = monster.frame_width
        frame_height = monster.frame_height
        x = monster.x
        y = monster.y
        
        # ИСПРАВЛЕНИЕ: Удаляем старый таймер если есть
        if hasattr(self, 'respawn_timers'):
            if location in self.respawn_timers and monster_key in self.respawn_timers[location]:
                timer_id = self.respawn_timers[location][monster_key]
                if timer_id:
                    try:
                        self.root.after_cancel(timer_id)
                    except:
                        pass
        
        # Создаем фрейм таймера ТОЧНО ТАКОГО ЖЕ РАЗМЕРА
        respawn_frame = tk.Frame(self.root, bg="#333", relief="raised", bd=2)
        respawn_frame.place(x=x, y=y, width=frame_width, height=frame_height)
        
        # Содержимое фрейма таймера
        tk.Label(respawn_frame, text="💀", 
                  font=("Arial", 24), bg="#333", fg="orange").pack(pady=(5, 2))
        
        tk.Label(respawn_frame, text="Регенерация", 
                 font=("Arial", 10, "bold"), bg="#333", fg="orange").pack()
        
        timer_text = tk.Label(respawn_frame, 
                            text=f"{remaining_seconds}с", 
                            font=("Arial", 14, "bold"), 
                            bg="#333", fg="orange")
        timer_text.pack(pady=(5, 5))
        
        def update_timer(current_remaining):
            # Проверяем, существует ли еще фрейм
            if not (respawn_frame and respawn_frame.winfo_exists()):
                return
            
            if current_remaining > 0:
                timer_text.config(text=f"{current_remaining}с")
                # print(f"⏰ Таймер {monster.name}: {current_remaining}с")
                
                # Запланировать следующее обновление
                timer_id = self.root.after(1000, update_timer, current_remaining - 1)
                
                # Сохраняем ID таймера
                if not hasattr(self, 'respawn_timers'):
                    self.respawn_timers = {}
                if location not in self.respawn_timers:
                    self.respawn_timers[location] = {}
                self.respawn_timers[location][monster_key] = timer_id
            else:
                print(f"🎉 Таймер истек, возрождаем монстра {monster.name}")
                self.respawn_specific_monster(location, index)
        
        # Запускаем таймер
        timer_id = self.root.after(1000, update_timer, remaining_seconds - 1)
        
        # Сохраняем ID таймера
        if not hasattr(self, 'respawn_timers'):
            self.respawn_timers = {}
        if location not in self.respawn_timers:
            self.respawn_timers[location] = {}
        self.respawn_timers[location][monster_key] = timer_id
        
        # Сохраняем фрейм таймера с размерами
        if not hasattr(self, 'respawn_frames'):
            self.respawn_frames = {}
        self.respawn_frames[monster_key] = {
            'frame': respawn_frame,
            'width': frame_width,
            'height': frame_height,
            'x': x,
            'y': y
        }
    
    def respawn_specific_monster(self, location, monster_index):
        """Возродить конкретного монстра по индексу (для обратной совместимости)"""
        print(f"🌟 Возрождение монстра по индексу {monster_index} в {location}")
        
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            print(f"⚠️ Монстр с индексом {monster_index} не найден в локации {location}")
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        if not monster:
            print(f"⚠️ Не удалось создать монстра из данных по индексу {monster_index}")
            return
        
        # Используем новый метод с ID
        self.respawn_specific_monster_by_id(location, monster.id)

    def respawn_specific_monster_by_id(self, location, monster_id):
        """Возродить конкретного монстра по ID"""
        print(f"🌟 Возрождение монстра с ID {monster_id} в {location}")
        
        monster_key = f"{location}_monster_{monster_id}"
        
        # Очищаем таймеры
        if hasattr(self, 'respawn_timers'):
            if location in self.respawn_timers and monster_key in self.respawn_timers[location]:
                timer_id = self.respawn_timers[location][monster_key]
                if timer_id:
                    try:
                        self.root.after_cancel(timer_id)
                    except:
                        pass
                del self.respawn_timers[location][monster_key]
        
        # Удаляем фрейм таймера
        if hasattr(self, 'respawn_frames') and monster_key in self.respawn_frames:
            frame_data = self.respawn_frames[monster_key]
            frame = frame_data.get('frame')
            if frame and frame.winfo_exists():
                frame.destroy()
            del self.respawn_frames[monster_key]
        
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        # Ищем монстра по ID
        monster_index = -1
        for i, monster_data in enumerate(monsters_data):
            if isinstance(monster_data, dict) and monster_data.get("id") == monster_id:
                monster_index = i
                break
        
        if monster_index >= 0:
            monster_data = monsters_data[monster_index]
            monster = Monster.from_dict(monster_data)
            
            # Полностью восстанавливаем монстра
            monster.is_alive = True
            monster.hp = monster.hp_max
            monster.respawn_time = None  # Сбрасываем время возрождения
            
            print(f"✅ Монстр {monster.name} (ID: {monster.id}) возрожден с HP={monster.hp}")
            
            # Обновляем монстра в массиве
            monsters_data[monster_index] = monster.to_dict()
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            
            # Показываем обновленных монстров
            self.show_monsters_in_location(location)
        else:
            print(f"⚠️ Монстр с ID {monster_id} не найден в локации {location}")

    def start_battle_with_monster(self, monster, location, index=None):
        """Начать бой с монстром"""
        if self.battle_active:
            return
        
        print(f"⚔️ Начинаем бой с {monster.name} (ID: {monster.id}) в {location}")
        
        if not monster.is_alive or monster.hp <= 0:
            messagebox.showinfo("ℹ️", "Монстр мёртв. Ждите возрождения.")
            return
        
        self.battle_active = True
        self.battle_monster = monster
        self.battle_location = location
        self.player_acted_this_turn = False
        self.monster_acted_this_turn = False
        self.hide_sidebar()
        self.cancel_all_timers()
        self.clear_window()
        self.battle_interface(monster, location)

    # ================ ОСНОВНЫЕ ЭКРАНЫ ================
    def show_main_menu(self):
        """Показать главное меню"""
        self.current_screen = "main"
        self.clear_window()
        self.current_location = "Главная"
        self.player_data["current_location"] = self.current_location
        self.save_current_player()
        cfg = self.config["locations"]["Главная"]
        
        # Сохраняем текущую локацию
        self.player_data["current_location"] = self.current_location
        self.save_current_player()
        
        header = tk.Frame(self.root, bg=cfg.get("bg_color", "#FFFFFF"), relief="groove", bd=1)
        header.pack(fill="x", pady=(10, 5))
        tk.Label(header, text=cfg.get("title", "Главная"), font=("Arial", 16, "bold"),
                 fg=cfg.get("fg_color", "#000000"), bg=cfg.get("bg_color", "#FFFFFF")).pack(pady=10)
        tk.Label(header, text=f"Привет, {self.player_data.get('name', 'Герой')}!", font=("Arial", 12),
                 fg=cfg.get("fg_color", "#000000"), bg=cfg.get("bg_color", "#FFFFFF")).pack()

        for btn_id, btn_cfg in cfg.items():
            if isinstance(btn_cfg, dict) and btn_id not in ("title", "monster", "monster_bg_color", "monster_fg_color", "loot_pile"):
                self.create_button(btn_id, btn_cfg, "Главная")

        self.show_monsters_in_location("Главная")
        self.show_loot_pile("Главная")
        # Создаем кнопку гамбургера
        self.create_hamburger_button()
        
        # Закрываем сайдбар если был открыт
        if hasattr(self, 'sidebar_frame') and self.sidebar_frame:
            try:
                if self.sidebar_frame.winfo_exists():
                    self.sidebar_frame.destroy()
            except:
                pass
        
        self.sidebar_open = False
        
        if not self.regeneration_timer:
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)

    def show_location(self, name):
        """Показать локацию"""
        self.current_screen = "location"
        if name not in self.config["locations"]:
            return
        
        # Очищаем дубликаты монстров
        removed = self.cleanup_duplicate_monsters(name)
        if removed > 0:
            print(f"🧹 Очищено {removed} дубликатов монстров")
        
        # Исправляем время возрождения ТОЛЬКО для тех, у кого его нет
        self.fix_respawn_times(name)
        
        self.clear_window()
        self.current_location = name
        self.save_current_player()
        cfg = self.config["locations"][name]
        
        # Сохраняем текущую локацию
        self.player_data["current_location"] = self.current_location
        self.save_current_player()
        
        header = tk.Frame(self.root, bg=cfg.get("bg_color", "#FFFFFF"), relief="groove", bd=1)
        header.pack(fill="x", pady=(10, 5))
        tk.Label(header, text=cfg.get("title", name), font=("Arial", 16, "bold"),
                 fg=cfg.get("fg_color", "#000000"), bg=cfg.get("bg_color", "#FFFFFF")).pack(pady=10)

        for btn_id, btn_cfg in cfg.items():
            if isinstance(btn_cfg, dict) and btn_id not in ("title", "monster", "monster_bg_color", "monster_fg_color", "loot_pile"):
                self.create_button(btn_id, btn_cfg, name)

        self.show_monsters_in_location(name)
        self.show_loot_pile(name)
        self.show_monsters_in_location(name)
        self.show_loot_pile(name)
        
        # Создаем кнопку гамбургера
        self.create_hamburger_button()
        
        # Закрываем сайдбар если был открыт
        if hasattr(self, 'sidebar_frame') and self.sidebar_frame:
            try:
                if self.sidebar_frame.winfo_exists():
                    self.sidebar_frame.destroy()
            except:
                pass
        
        self.sidebar_open = False
        
        if not self.regeneration_timer:
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)


    def create_button(self, btn_id, cfg, loc):
        """Создать кнопку в локации"""
        font = (cfg.get("font_family", "Arial"), cfg.get("font_size", 12))
        if cfg.get("bold", False):
            font += ("bold",)
        
        btn = tk.Button(self.root, text=cfg.get("text", ""), font=font,
                        bg=cfg.get("bg", "#ccc"), fg=cfg.get("fg", "black"))
        
        x = cfg.get("x", 100)
        y = cfg.get("y", 100)
        w = cfg.get("width", 120)
        h = cfg.get("height", 40)
        
        btn.place(x=x, y=y, width=w, height=h)
        
        if cfg.get("is_transition") and cfg.get("target_location"):
            btn.config(command=lambda t=cfg["target_location"]: self.start_transition(t))
        elif cfg.get("text") == "🎒 Сундук":
            btn.config(command=self.open_chest)
        
        self.buttons[f"{loc}_{btn_id}"] = btn
        return btn

    def start_transition(self, target_location):
        """Начать переход между локациями"""
        if target_location not in self.config["locations"]:
            messagebox.showerror("Ошибка", f"Локация '{target_location}' не найдена")
            return
        
        self.player_data["current_location"] = target_location
        self.save_current_player()
        self.clear_window()
        
        # Создаем красивый экран перехода
        transition_frame = tk.Frame(self.root, bg="#1a1a2e")
        transition_frame.pack(fill="both", expand=True)
        
        # Текущая локация
        current_title = self.config["locations"][self.current_location].get("title", self.current_location)
        target_title = self.config["locations"][target_location].get("title", target_location)
        
        # Анимированная иконка перехода
        icon_label = tk.Label(transition_frame, text="✨", font=("Arial", 48), 
                             bg="#1a1a2e", fg="#FFD700")
        icon_label.pack(pady=30)
        
        # Названия локаций
        locations_frame = tk.Frame(transition_frame, bg="#1a1a2e")
        locations_frame.pack(pady=20)
        
        tk.Label(locations_frame, text=current_title, font=("Arial", 14, "bold"),
                bg="#1a1a2e", fg="#4CC9F0").pack(side="left", padx=20)
        
        tk.Label(locations_frame, text="→", font=("Arial", 18, "bold"),
                bg="#1a1a2e", fg="#FFD700").pack(side="left", padx=10)
        
        tk.Label(locations_frame, text=target_title, font=("Arial", 14, "bold"),
                bg="#1a1a2e", fg="#F72585").pack(side="left", padx=20)
        
        # Стилизованный прогресс-бар
        progress_frame = tk.Frame(transition_frame, bg="#16213e", relief="ridge", bd=3, padx=10, pady=10)
        progress_frame.pack(pady=30)
        
        tk.Label(progress_frame, text="⏳ ПУТЕШЕСТВИЕ", font=("Arial", 12, "bold"),
                bg="#16213e", fg="#FFD700").pack(pady=(0, 10))
        
        # Улучшенный прогресс-бар
        self.transition_progress = tk.DoubleVar(value=0)
        
        # Стиль для прогресс-бара перехода
        style = ttk.Style()
        style.theme_use('default')
        
        style.configure("Transition.Horizontal.TProgressbar",
                       troughcolor='#0f3460',
                       background='#4CC9F0',
                       bordercolor='#0f3460',
                       lightcolor='#4CC9F0',
                       darkcolor='#4CC9F0',
                       thickness=20)
        
        pb = ttk.Progressbar(progress_frame, variable=self.transition_progress,
                            maximum=100, length=300,
                            style="Transition.Horizontal.TProgressbar",
                            mode='determinate')
        pb.pack(pady=10)
        
        # Текст прогресса
        self.progress_text = tk.Label(progress_frame, text="0%", 
                                     font=("Arial", 10, "bold"),
                                     bg="#16213e", fg="#FFFFFF")
        self.progress_text.pack()
        
        # Анимация иконки
        icons = ["✨", "🌟", "⚡", "🔥", "💫"]
        icon_index = 0
        
        def animate_icon():
            nonlocal icon_index
            icon_label.config(text=icons[icon_index])
            icon_index = (icon_index + 1) % len(icons)
            if hasattr(self, 'transition_progress'):  # Проверяем, активен ли еще переход
                icon_label.after(300, animate_icon)
        
        # Запуск анимации
        animate_icon()
        
        # Запуск прогресса
        self.progress_start = time.time()
        self.target_location = target_location
        self.update_transition_progress(pb)

    def update_transition_progress(self, pb):
        """Обновить прогресс перехода"""
        elapsed = time.time() - self.progress_start
        if elapsed < 3.0:
            progress_percent = (elapsed / 3.0) * 100
            self.transition_progress.set(progress_percent)
            self.progress_text.config(text=f"{int(progress_percent)}%")
            
            # Меняем цвет прогресс-бара в зависимости от прогресса
            if progress_percent < 33:
                pb.configure(style="Transition.Horizontal.TProgressbar")
            elif progress_percent < 66:
                style = ttk.Style()
                style.configure("TransitionWarning.Horizontal.TProgressbar",
                              troughcolor='#0f3460',
                              background='#FFD700',
                              bordercolor='#0f3460',
                              lightcolor='#FFD700',
                              darkcolor='#FFD700',
                              thickness=20)
                pb.configure(style="TransitionWarning.Horizontal.TProgressbar")
            else:
                style = ttk.Style()
                style.configure("TransitionSuccess.Horizontal.TProgressbar",
                              troughcolor='#0f3460',
                              background='#F72585',
                              bordercolor='#0f3460',
                              lightcolor='#F72585',
                              darkcolor='#F72585',
                              thickness=20)
                pb.configure(style="TransitionSuccess.Horizontal.TProgressbar")
            
            self.root.after(50, self.update_transition_progress, pb)
        else:
            self.transition_progress.set(100)
            self.progress_text.config(text="100%")
            self.root.after(500, lambda: self.show_location(self.target_location))

    def clear_window(self):
        """Очистить окно"""
        self.cancel_all_timers()
        
        # Также удаляем фреймы монстров если они есть
        if hasattr(self, 'monster_frames'):
            for monster_key, frame_data in self.monster_frames.items():
                frame = frame_data.get('frame')
                if frame and frame.winfo_exists():
                    frame.destroy()
            self.monster_frames = {}
        
        if hasattr(self, 'respawn_frames'):
            for monster_key, frame_data in self.respawn_frames.items():
                frame = frame_data.get('frame')
                if frame and frame.winfo_exists():
                    frame.destroy()
            self.respawn_frames = {}
        
        # Очищаем остальные виджеты
        for widget in self.root.winfo_children():
            widget.destroy()

    # ================ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ================
    def refresh_current_view(self):
        """Обновить текущий экран"""
        if self.current_screen == "inventory":
            self.show_inventory()
        elif self.current_screen == "character":
            self.show_character()
        elif self.current_screen == "location":
            self.show_location(self.current_location)
        elif self.current_screen == "main":
            self.show_main_menu()
        elif self.current_screen == "chest":
            self.open_chest()
        elif self.current_screen == "equip":
            self.show_character()
        elif self.current_screen == "abilities":
            self.show_abilities()
        elif self.current_screen == "login":
            self.show_login_screen()
        elif self.current_screen == "register":
            self.show_register_screen()
        
        if self.sidebar_open:
            self.update_sidebar_stats()

    def refresh_current_location(self):
        """Обновить текущую локацию"""
        if self.current_location == "Главная":
            self.show_main_menu()
        else:
            self.show_location(self.current_location)

    def update_component(self, component_name, *args):
        """Обновить конкретный компонент интерфейса"""
        if component_name == "health":
            self.update_health_display()
        elif component_name == "mana":
            self.update_mana_display()
        elif component_name == "stats":
            self.update_sidebar_stats()
        elif component_name == "inventory":
            if self.current_screen == "inventory":
                self.show_inventory()
        elif component_name == "character":
            if self.current_screen == "character":
                self.show_character()

    # ================ БОЙ ================
    # ================ БОЙ ================
    def battle_interface(self, monster, location):
        """Интерфейс боя"""
        self.battle_monster = monster
        self.battle_location = location
        self.battle_active = True
        self.current_turn = "shared"
        self.player_acted_this_turn = False
        self.monster_acted_this_turn = False
        self.turn_end_scheduled = False
        self.ability_buttons = {}
        self.battle_log = []
        
        # Фон боя
        self.root.configure(bg="#0A0A0A")
        
        # Верхняя часть - статистики
        top_frame = tk.Frame(self.root, bg="#0A0A0A", height=150)
        top_frame.pack(fill="x", side="top", pady=5)
        
        # Статистики игрока
        player_stats_frame = tk.Frame(top_frame, bg="#1E3A5F", relief="ridge", bd=2, width=280, height=140)
        player_stats_frame.pack(side="left", fill="both", expand=True, padx=(10, 5), pady=5)
        player_stats_frame.pack_propagate(False)
        
        player_header = tk.Frame(player_stats_frame, bg="#2D5A9A", height=30)
        player_header.pack(fill="x")
        tk.Label(player_header, text="👤 ВАШ ПЕРСОНАЖ", font=("Arial", 12, "bold"),
                bg="#2D5A9A", fg="white").pack(pady=5)
        
        player_info_frame = tk.Frame(player_stats_frame, bg="#1E3A5F", padx=10, pady=10)
        player_info_frame.pack(fill="both", expand=True)
        
        player_class = self.player_data.get("class", "Воин")
        class_icon = {"Воин": "⚔️", "Маг": "🔮", "Охотник": "🏹"}.get(player_class, "👤")
        
        tk.Label(player_info_frame, text=f"{class_icon} {self.player_data.get('name', 'Герой')}",
                font=("Arial", 12, "bold"), bg="#1E3A5F", fg="#FFFFFF").pack(anchor="w", pady=(0, 10))
        
        # HP игрока
        hp_frame = tk.Frame(player_info_frame, bg="#1E3A5F")
        hp_frame.pack(fill="x", pady=3)
        tk.Label(hp_frame, text="❤️ ЗДОРОВЬЕ:", font=("Arial", 10, "bold"),
                bg="#1E3A5F", fg="#FF5252", width=15, anchor="w").pack(side="left")
        self.player_hp_label = tk.Label(hp_frame, 
                text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}",
                font=("Arial", 10, "bold"), bg="#1E3A5F", fg="#FF5252")
        self.player_hp_label.pack(side="right")
        
        # MP игрока
        mp_frame = tk.Frame(player_info_frame, bg="#1E3A5F")
        mp_frame.pack(fill="x", pady=3)
        tk.Label(mp_frame, text="💙 МАНА:", font=("Arial", 10, "bold"),
                bg="#1E3A5F", fg="#64B5F6", width=15, anchor="w").pack(side="left")
        self.player_mp_label = tk.Label(mp_frame,
                text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}",
                font=("Arial", 10, "bold"), bg="#1E3A5F", fg="#64B5F6")
        self.player_mp_label.pack(side="right")
        
        # Урон и броня
        stats = self.calculate_stats()
        dmg_frame = tk.Frame(player_info_frame, bg="#1E3A5F")
        dmg_frame.pack(fill="x", pady=3)
        tk.Label(dmg_frame, text="⚔️ УРОН:", font=("Arial", 10),
                bg="#1E3A5F", fg="#FF8A65", width=15, anchor="w").pack(side="left")
        tk.Label(dmg_frame, text=str(stats["damage"]), font=("Arial", 10, "bold"),
                bg="#1E3A5F", fg="#FF8A65").pack(side="right")
        
        armor_frame = tk.Frame(player_info_frame, bg="#1E3A5F")
        armor_frame.pack(fill="x", pady=3)
        tk.Label(armor_frame, text="🛡️ БРОНЯ:", font=("Arial", 10),
                bg="#1E3A5F", fg="#81C784", width=15, anchor="w").pack(side="left")
        tk.Label(armor_frame, text=str(stats["armor"]), font=("Arial", 10, "bold"),
                bg="#1E3A5F", fg="#81C784").pack(side="right")
        
        # Статистики монстра
        monster_stats_frame = tk.Frame(top_frame, bg="#5D1F1F", relief="ridge", bd=2, width=280, height=140)
        monster_stats_frame.pack(side="right", fill="both", expand=True, padx=(5, 10), pady=5)
        monster_stats_frame.pack_propagate(False)
        
        monster_header = tk.Frame(monster_stats_frame, bg="#8B0000", height=30)
        monster_header.pack(fill="x")
        tk.Label(monster_header, text="👹 ПРОТИВНИК", font=("Arial", 12, "bold"),
                bg="#8B0000", fg="white").pack(pady=5)
        
        # === ОБЯЗАТЕЛЬНО ОБЪЯВИТЕ ЭТУ ПЕРЕМЕННУЮ ЗДЕСЬ ===
        monster_info_frame = tk.Frame(monster_stats_frame, bg="#5D1F1F", padx=10, pady=10)
        monster_info_frame.pack(fill="both", expand=True)
        
        monster_top_frame = tk.Frame(monster_info_frame, bg="#5D1F1F")
        monster_top_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(monster_top_frame, text=monster.icon, font=("Arial", 20),
                bg="#5D1F1F", fg="#FF8A8A").pack(side="left", padx=(0, 10))
        
        name_frame = tk.Frame(monster_top_frame, bg="#5D1F1F")
        name_frame.pack(side="left", fill="both", expand=True)
        tk.Label(name_frame, text=monster.name, font=("Arial", 12, "bold"),
                bg="#5D1F1F", fg="#FF8A8A").pack(anchor="w")
        
        monster_hp_frame = tk.Frame(monster_info_frame, bg="#5D1F1F")
        monster_hp_frame.pack(fill="x", pady=3)
        tk.Label(monster_hp_frame, text="❤️ ЗДОРОВЬЕ:", font=("Arial", 10, "bold"),
                bg="#5D1F1F", fg="#FF5252", width=15, anchor="w").pack(side="left")
        self.monster_hp_label = tk.Label(monster_hp_frame,
                text=f"{monster.hp}/{monster.hp_max}",
                font=("Arial", 10, "bold"), bg="#5D1F1F", fg="#FF5252")
        self.monster_hp_label.pack(side="right")
        
        monster_dmg_frame = tk.Frame(monster_info_frame, bg="#5D1F1F")
        monster_dmg_frame.pack(fill="x", pady=3)
        tk.Label(monster_dmg_frame, text="⚔️ УРОН:", font=("Arial", 10),
                bg="#5D1F1F", fg="#FF8A65", width=15, anchor="w").pack(side="left")
        tk.Label(monster_dmg_frame, text=f"{monster.min_dmg}-{monster.max_dmg}",
                font=("Arial", 10, "bold"), bg="#5D1F1F", fg="#FF8A65").pack(side="right")
        
        # === ДОБАВЬТЕ ОТОБРАЖЕНИЕ ОПЫТА В БОЮ ===
        monster_exp_frame = tk.Frame(monster_info_frame, bg="#5D1F1F")
        monster_exp_frame.pack(fill="x", pady=3)
        tk.Label(monster_exp_frame, text="⭐ ОПЫТ:", font=("Arial", 10),
                bg="#5D1F1F", fg="#FFD700", width=15, anchor="w").pack(side="left")
        tk.Label(monster_exp_frame, text=str(monster.exp_reward),
                font=("Arial", 10, "bold"), bg="#5D1F1F", fg="#FFD700").pack(side="right")
        
        if monster.stunned_turns > 0:
            tk.Label(monster_info_frame, text=f"⚡ Оглушен: {monster.stunned_turns} ход.", 
                    font=("Arial", 9, "bold"), bg="#5D1F1F", fg="#FFD54F").pack(anchor="w", pady=(5, 0))
        
        # Центральная панель - управление боем
        center_frame = tk.Frame(self.root, bg="#0A0A0A")
        center_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Индикатор хода
        turn_indicator = tk.Frame(center_frame, bg="#2C2C2C", relief="ridge", bd=2)
        turn_indicator.pack(fill="x", pady=(0, 10))
        
        self.turn_label = tk.Label(turn_indicator, text="🎮 ОБЩИЙ ХОД",
                                  font=("Arial", 14, "bold"), bg="#2196F3", fg="white", padx=20, pady=10)
        self.turn_label.pack()
        
        # Таймер хода
        timer_frame = tk.Frame(center_frame, bg="#2C2C2C", relief="sunken", bd=2)
        timer_frame.pack(fill="x", pady=(0, 10))
        
        self.turn_timer_label = tk.Label(timer_frame, text="⏱️ Время хода: 15 сек",
                                         font=("Arial", 11, "bold"), bg="#2C2C2C", fg="#FFD54F", pady=8)
        self.turn_timer_label.pack()
        
        # Прогресс-бар времени
        self.turn_progress = tk.DoubleVar(value=0)
        
        style = ttk.Style()
        style.theme_use('default')
        
        style.configure("BattleProgress.Horizontal.TProgressbar",
                       troughcolor='#2C2C2C',
                       background='#2196F3',
                       bordercolor='#2C2C2C',
                       lightcolor='#2196F3',
                       darkcolor='#2196F3',
                       thickness=15)
        
        self.turn_bar = ttk.Progressbar(center_frame, variable=self.turn_progress, 
                                        maximum=100, length=400, 
                                        style="BattleProgress.Horizontal.TProgressbar",
                                        mode='determinate')
        self.turn_bar.pack(pady=(0, 15))
        
        # Панель действий
        actions_frame = tk.Frame(center_frame, bg="#0A0A0A")
        actions_frame.pack(fill="both", expand=True)
        
        # Левая часть - кнопка атаки
        left_actions = tk.Frame(actions_frame, bg="#0A0A0A", width=200)
        left_actions.pack(side="left", fill="both", expand=True, padx=(0, 5))
        
        self.attack_button = tk.Button(
            left_actions, text="⚔️ АТАКА", font=("Arial", 14, "bold"),
            bg="#D32F2F", fg="white", width=15, height=3,
            command=lambda: self.player_attack(),
            relief="raised", bd=3
        )
        self.attack_button.pack(pady=10)
        
        # Кнопка умений
        self.abilities_button = tk.Button(
            left_actions, text="✨ УМЕНИЯ", font=("Arial", 14, "bold"),
            bg="#7B1FA2", fg="white", width=15, height=3,
            command=self.show_battle_abilities,
            relief="raised", bd=3
        )
        self.abilities_button.pack(pady=10)
        
        # Панель лога действий
        log_frame = tk.Frame(center_frame, bg="#1A1A1A", relief="sunken", bd=2, height=80)
        log_frame.pack(fill="x", pady=(10, 0))
        log_frame.pack_propagate(False)
        
        log_header = tk.Frame(log_frame, bg="#2D2D2D", height=25)
        log_header.pack(fill="x")
        tk.Label(log_header, text="📜 ИСТОРИЯ БОЯ", font=("Arial", 10, "bold"),
                bg="#2D2D2D", fg="#FFD54F").pack(pady=3)
        
        self.battle_log_frame = tk.Frame(log_frame, bg="#1A1A1A")
        self.battle_log_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Начальное сообщение
        self.add_battle_log("Бой начался! Вы сражаетесь с " + monster.name, "#4CAF50")
        
        self.start_turn()

    def add_battle_log(self, message, color="#FFFFFF"):
        """Добавить сообщение в лог боя"""
        self.battle_log.append((message, color))
        
        if len(self.battle_log) > self.max_log_entries:
            self.battle_log.pop(0)
        
        self.update_battle_log_display()
        
        # Также показываем важные сообщения как уведомления
        if "критический" in message.lower() or "оглушен" in message.lower():
            self.notification.show_notification(message, "warning", 1500)
        elif "победили" in message.lower():
            pass  # Показываем отдельное окно результата

    def update_battle_log_display(self):
        """Обновить отображение лога боя"""
        if hasattr(self, 'battle_log_frame') and self.battle_log_frame and self.battle_log_frame.winfo_exists():
            for widget in self.battle_log_frame.winfo_children():
                widget.destroy()
            
            for i, (message, color) in enumerate(reversed(self.battle_log)):
                log_label = tk.Label(self.battle_log_frame, text=f"• {message}", 
                                    font=("Arial", 9), bg="#1A1A1A", fg=color,
                                    anchor="w", justify="left", padx=5)
                log_label.pack(fill="x", pady=1)

    def start_turn(self):
        """Начать общий ход (10 секунд, монстр атакует в 5-9 секунд)"""
        if not self.battle_active:
            return
        
        self.turn_start_time = time.time()
        self.turn_end_scheduled = False
        self.player_acted_this_turn = False
        self.monster_acted_this_turn = False
        self.turn_time = 10  # 10 секунд на общий ход
        self.monster_attack_scheduled = False  # Флаг что атака монстра запланирована
        
        # Обновляем перезарядку умений
        for ability in self.abilities.values():
            if ability.current_cooldown > 0:
                ability.current_cooldown -= 1
                print(f"🔄 Умение {ability.name}: перезарядка {ability.current_cooldown}/{ability.cooldown}")
        
        # ================ ОБНОВЛЯЕМ ОКНА УМЕНИЙ ПРИ СМЕНЕ ХОДА ================
        if hasattr(self, 'update_all_abilities_windows'):
            try:
                self.update_all_abilities_windows()
            except:
                pass
        
        # Сбрасываем состояние кнопок
        self.turn_label.config(text="🎮 ОБЩИЙ ХОД", bg="#2196F3", fg="white")
        
        if hasattr(self, 'attack_button'):
            self.attack_button.config(state="normal", bg="#D32F2F")
        
        if hasattr(self, 'abilities_button'):
            self.abilities_button.config(state="normal", bg="#7B1FA2")
        
        self.add_battle_log("Начался общий ход (10 сек)! У вас и у монстра есть по одному действию", "#2196F3")
        
        # Проверяем доступность умений
        self.update_ability_buttons_availability()
        
        # Закрываем все открытые окна умений при смене хода
        for widget in self.root.winfo_children():
            if isinstance(widget, tk.Toplevel) and "Умения" in widget.title():
                try:
                    if widget.winfo_exists():
                        widget.destroy()
                except:
                    pass
        
        # ПЛАНИРУЕМ АТАКУ МОНСТРА В СЛУЧАЙНЫЙ МОМЕНТ МЕЖДУ 5-9 СЕКУНДАМИ
        if (self.battle_monster and self.battle_monster.hp > 0 and 
            not self.monster_acted_this_turn):
            
            if self.battle_monster.stunned_turns > 0:
                self.add_battle_log(f"Монстр оглушен и пропускает ход", "#FFB74D")
                self.battle_monster.stunned_turns -= 1
                self.monster_acted_this_turn = True
            else:
                # Случайное время атаки между 5-9 секундами (5000-9000 мс)
                attack_delay = random.randint(5000, 9000)
                print(f"👹 Монстр атакует через {attack_delay/1000:.1f} секунд")
                
                # Запланировать атаку монстра
                if hasattr(self, 'root'):
                    self.monster_attack_scheduled = True
                    self.root.after(attack_delay, self.execute_scheduled_monster_attack)
                    self.add_battle_log(f"Монстр готовится к атаке...", "#FF9800")
        
        self.turn_progress.set(0)
        
        # Запускаем таймер
        if hasattr(self, 'update_turn_timer'):
            self.update_turn_timer()
        else:
            # Если метода нет, создаем базовый таймер
            self.start_basic_timer()

    def execute_scheduled_monster_attack(self):
        """Выполнить запланированную атаку монстра"""
        try:
            # Проверяем, существует ли еще бой
            if not self.battle_active:
                return
            
            # Проверяем, не атаковал ли уже монстр
            if self.monster_acted_this_turn:
                return
            
            # Проверяем, не убит ли монстр
            if not self.battle_monster or self.battle_monster.hp <= 0:
                return
            
            # Проверяем, не оглушен ли монстр
            if self.battle_monster.stunned_turns > 0:
                self.add_battle_log(f"Монстр все еще оглушен!", "#FFB74D")
                self.battle_monster.stunned_turns -= 1
                self.monster_acted_this_turn = True
                return
            
            print(f"👹 Монстр выполняет атаку!")
            self.monster_acted_this_turn = True
            self.monster_attack_scheduled = False
            
            # Выполняем атаку
            self.perform_monster_attack()
            
        except Exception as e:
            print(f"⚠️ Ошибка в execute_scheduled_monster_attack: {e}")

    def perform_monster_attack(self):
        """Выполнить атаку монстра"""
        try:
            if not self.battle_monster or self.battle_monster.hp <= 0:
                return
            
            base_dmg = self.battle_monster.attack()
            armor = self.calculate_stats()["armor"]
            final_dmg = self.apply_armor_to_damage(base_dmg, armor)
            
            reflected_damage = 0
            if hasattr(self, 'active_ability_effect') and self.active_ability_effect == "defense":
                reflected_damage = int(final_dmg * 0.3)
                final_dmg = 0
                self.active_ability_effect = None
                self.add_battle_log(f"🛡️ Щит отразил атаку! Отраженный урон: {reflected_damage}", "#4CAF50")
                
                self.battle_monster.take_damage(reflected_damage)
                if hasattr(self, 'monster_hp_label'):
                    try:
                        self.monster_hp_label.config(text=f"❤️ HP: {self.battle_monster.hp}/{self.battle_monster.hp_max}")
                    except:
                        pass
                
                self.add_battle_log(f"Монстр получил {reflected_damage} отраженного урона", "#4CAF50")
                
                try:
                    self.show_damage_animation(450, 80, f"-{reflected_damage}", "#4CAF50")
                except:
                    pass
            
            if final_dmg > 0:
                self.player_data["hp"] = max(0, self.player_data["hp"] - final_dmg)
                self.add_battle_log(f"Монстр атакует и наносит {final_dmg} урона (броня снизила урон с {base_dmg})", "#EF5350")
            
            self.update_health_display()
            
            # Показываем анимацию урона
            if final_dmg > 0:
                try:
                    self.show_damage_animation(150, 80, f"-{final_dmg}", "#D32F2F")
                except:
                    pass
            
            # Проверяем, не убит ли игрок
            if self.player_data["hp"] <= 0:
                try:
                    self.root.after(1500, lambda: self.check_battle_end())
                except:
                    pass
                
        except Exception as e:
            print(f"⚠️ Ошибка в perform_monster_attack: {e}")

    def update_ability_buttons_availability(self):
        """Обновить доступность кнопок умений в зависимости от перезарядки"""
        if not self.battle_active or self.player_acted_this_turn:
            return
        
        player_mp = self.player_data.get("mp", 0)
        player_class = self.player_data.get("class")
        
        # Проверяем, есть ли доступные умения для использования
        has_available_abilities = False
        for ab_id in self.equipped_abilities:
            if ab_id in self.abilities:
                ability = self.abilities[ab_id]
                if ability.can_use(player_mp, player_class):
                    has_available_abilities = True
                    break
        
        # Обновляем кнопку умений на панели боя
        if hasattr(self, 'abilities_button'):
            if has_available_abilities:
                self.abilities_button.config(state="normal", bg="#7B1FA2")
            else:
                self.abilities_button.config(state="normal", bg="#757575")
        
        # Обновляем открытое окно умений, если оно есть - ИСПРАВЛЕНО
        self.update_opened_abilities_windows()

    # ДОБАВЬТЕ ЭТОТ НОВЫЙ МЕТОД ЕСЛИ ЕГО ЕЩЕ НЕТ
    def update_opened_abilities_windows(self):
        """Обновить открытые окна умений"""
        # Ищем открытые окна умений
        for widget in self.root.winfo_children():
            if isinstance(widget, tk.Toplevel) and "Умения" in widget.title():
                try:
                    # Обновляем содержимое окна
                    for child in widget.winfo_children():
                        if isinstance(child, tk.Frame):
                            # Очищаем и пересоздаем карточки умений
                            self.refresh_abilities_in_window(child)
                            break
                except Exception as e:
                    print(f"⚠️ Ошибка обновления окна умений: {e}")

    def refresh_abilities_in_window(self, parent_frame):
        """Обновить умения в окне"""
        try:
            # Находим контейнер для карточек умений
            for widget in parent_frame.winfo_children():
                if isinstance(widget, tk.Frame) and hasattr(widget, '_is_abilities_container'):
                    # Очищаем старые карточки
                    for card in widget.winfo_children():
                        card.destroy()
                    
                    # Создаем новые карточки
                    self.create_abilities_cards_for_window(widget)
                    break
        except Exception as e:
            print(f"⚠️ Ошибка обновления умений: {e}")

    def show_damage_animation(self, x, y, text, color):
        """Показать анимацию урона (исправленная версия)"""
        try:
            # Если старая анимация еще существует, уничтожаем ее
            if hasattr(self, '_damage_label') and self._damage_label:
                try:
                    if self._damage_label.winfo_exists():
                        self._damage_label.destroy()
                except:
                    pass
            
            self._damage_label = tk.Label(self.root, text=text, font=("Arial", 18, "bold"),
                                         fg=color, bg=self.root.cget("bg"))
            self._damage_label.place(x=x, y=y, anchor="center")
            
            def fade_out(opacity=1.0):
                try:
                    # Проверяем, существует ли еще виджет
                    if not self._damage_label or not self._damage_label.winfo_exists():
                        return
                    
                    if opacity > 0:
                        new_y = y - (15 * (1 - opacity))
                        self._damage_label.place(y=new_y)
                        opacity -= 0.1
                        self.root.after(50, lambda: fade_out(opacity))
                    else:
                        if self._damage_label and self._damage_label.winfo_exists():
                            self._damage_label.destroy()
                            self._damage_label = None
                except tk.TclError:
                    # Если виджет уже уничтожен, просто выходим
                    pass
            
            fade_out()
        except tk.TclError:
            # Если произошла ошибка при создании виджета, игнорируем
            pass

    def add_battle_log(self, message, color="#FFFFFF"):
        """Добавить сообщение в лог боя (исправленная версия)"""
        self.battle_log.append((message, color))
        
        if len(self.battle_log) > self.max_log_entries:
            self.battle_log.pop(0)
        
        try:
            self.update_battle_log_display()
        except:
            pass
        
        # Также показываем важные сообщения как уведомления
        if "критический" in message.lower() or "оглушен" in message.lower():
            try:
                self.notification.show_notification(message, "warning", 1500)
            except:
                pass


# ================ БОЙ ================
    def end_battle(self, victory, monster=None, location=None):
        """Завершить бой со стилизованным уведомлением"""
        print(f"🏁 Завершение боя: победа={victory}, монстр={monster.name} (ID: {monster.id})")
        
        # Сбрасываем перезарядку всех умений при завершении боя
        for ability in self.abilities.values():
            ability.current_cooldown = 0
            print(f"🔄 Сброшена перезарядка умения: {ability.name}")
        
        self.battle_active = False
        self.cancel_all_timers()
        self.clear_window()
        
        self.root.configure(bg=self.original_bg_color)
        
        if victory and monster and location:
            # ГЕНЕРИРУЕМ ЛУТ ИЗ МОНСТРА
            dropped_items = []
            if hasattr(monster, 'loot_table') and monster.loot_table:
                for loot_item in monster.loot_table:
                    # Проверяем шанс выпадения
                    if random.randint(1, 100) <= loot_item.drop_chance:
                        item_data = loot_item.generate()
                        dropped_items.append(item_data)
                        print(f"🎁 Выпал лут: {item_data.get('name', 'Предмет')}")
            
            # Если нет настроенного лута, создаем базовый
            if not dropped_items and random.randint(1, 100) <= 70:  # 70% шанс на базовый лут
                base_items = self.load_static_items()
                # Список возможных базовых предметов
                possible_items = ["health_potion", "wooden_sword", "shirt", "boots", "gloves"]
                if possible_items:
                    item_id = random.choice(possible_items)
                    item_data = base_items.get(item_id, {})
                    if item_data:
                        # Создаем уникальный ID для лута
                        generated_id = f"{item_id}_loot_{int(time.time() * 1000)}_{random.randint(1000, 9999)}"
                        loot_item = item_data.copy()
                        loot_item["id"] = generated_id
                        loot_item["base_item_id"] = item_id
                        dropped_items.append(loot_item)
                        print(f"🎲 Базовый лут: {loot_item.get('name', 'Предмет')}")
            
            # Используем настроенный опыт из монстра
            exp_reward = monster.exp_reward
            levels_gained = self.add_experience(exp_reward, show_message=False)
            
            # Устанавливаем время возрождения если его нет
            monster.is_alive = False
            if monster.respawn_time is None:
                monster.respawn_time = time.time() + monster.default_respawn_time
                print(f"⏰ Установлен respawn_time для {monster.name}: {monster.respawn_time}")
            
            # Сохраняем состояние монстра ВМЕСТЕ С respawn_time
            loc_cfg = self.config["locations"].get(location, {})
            monsters_data = loc_cfg.get("monsters", [])
            
            monster_index = -1
            for i, monster_data in enumerate(monsters_data):
                if isinstance(monster_data, dict) and monster_data.get("id") == monster.id:
                    monster_index = i
                    break
            
            if monster_index >= 0:
                # Сохраняем ВСЕ данные монстра, включая respawn_time
                updated_monster_data = monster.to_dict()
                monsters_data[monster_index] = updated_monster_data
                loc_cfg["monsters"] = monsters_data
                self.config["locations"][location] = loc_cfg
                save_config(self.config)
                
                print(f"⚰️ Монстр {monster.name} (ID: {monster.id}) убит, сохранено состояние")
                print(f"📊 Сохраненный respawn_time: {updated_monster_data.get('respawn_time')}")
            else:
                print(f"⚠️ Не удалось найти монстра {monster.name} (ID: {monster.id}) в конфиге")

            # ДОБАВЛЯЕМ ЛУТ В ЯМУ ИГРОКА (без уведомлений!)
            for item_data in dropped_items:
                # Добавляем прямо в яму без уведомлений
                items = self.get_player_loot_pile(location)
                
                # Проверяем лимит предметов в яме
                if len(items) < 10:
                    items.append(item_data)
                    self.save_player_loot_pile(location, items)
                    print(f"📦 Лут добавлен в яму: {item_data.get('name', 'Предмет')}")
                else:
                    print(f"⚠️ Яма переполнена, предмет не добавлен: {item_data.get('name', 'Предмет')}")
            
            # Показываем стилизованный результат боя
            def continue_after_battle():
                print(f"➡️ Продолжаем после боя")
                self.save_current_player()
                self.show_location(self.current_location)
                
                if not self.regeneration_timer:
                    self.regeneration_timer = self.root.after(2000, self.start_regeneration)
            
            # Создаем копию предметов для безопасного отображения
            safe_loot_items = []
            for item in dropped_items:
                safe_item = item.copy()
                # Убедимся, что у всех предметов есть необходимые поля
                safe_item.setdefault('icon', '📦')
                safe_item.setdefault('name', 'Предмет')
                safe_item.setdefault('rarity', 'Обычный')
                safe_item.setdefault('type', 'item')
                safe_item.setdefault('weight', 1.0)
                safe_loot_items.append(safe_item)
            
            # Проверяем, существует ли уведомление
            if hasattr(self, 'notification') and self.notification:
                print(f"📊 Показываем окно результатов боя")
                self.root.after(100, lambda: self.notification.show_battle_result(
                    victory=True,
                    monster_name=monster.name,
                    exp_reward=exp_reward,
                    loot_items=safe_loot_items,
                    levels_gained=levels_gained,
                    callback=continue_after_battle
                ))
            else:
                print(f"⚠️ Уведомление не доступно, продолжаем")
                continue_after_battle()
                
        elif not victory:
            self.player_data["hp"] = self.player_data["hp_max"] // 2
            self.save_current_player()
            
            # Показываем стилизованный результат поражения
            def continue_after_defeat():
                print(f"➡️ Продолжаем после поражения")
                self.save_current_player()
                self.show_location(self.current_location)
                
                if not self.regeneration_timer:
                    self.regeneration_timer = self.root.after(2000, self.start_regeneration)
            
            monster_name = monster.name if monster else "противника"
            if hasattr(self, 'notification') and self.notification:
                print(f"📊 Показываем окно поражения")
                self.root.after(100, lambda: self.notification.show_battle_result(
                    victory=False,
                    monster_name=monster_name,
                    exp_reward=0,
                    loot_items=None,
                    levels_gained=0,
                    callback=continue_after_defeat
                ))
            else:
                continue_after_defeat()
    # ================ ИНТЕРФЕЙС ПЕРСОНАЖА ================
    def show_character(self):
        """Показать интерфейс персонажа"""
        self.current_screen = "character"
        self.clear_window()
        
        # Заголовок
        header_frame = tk.Frame(self.root, bg="#6A1B9A", height=70, relief="raised", bd=3)
        header_frame.pack(fill="x", side="top")
        
        tk.Label(header_frame, text="👤", font=("Arial", 28), 
                bg="#6A1B9A", fg="white").pack(side="left", padx=(15, 5), pady=10)
        
        title_frame = tk.Frame(header_frame, bg="#6A1B9A")
        title_frame.pack(side="left", fill="y", pady=10)
        
        tk.Label(title_frame, text="ПЕРСОНАЖ", font=("Arial", 16, "bold"), 
                bg="#6A1B9A", fg="white").pack(anchor="w")
        
        player_name = self.player_data.get('name', 'Герой')
        player_class = self.player_data.get('class', 'Воин')
        player_gender = self.player_data.get('gender', 'Не указан')
        
        tk.Label(title_frame, text=f"{player_name} | {player_class} | {player_gender}", 
                font=("Arial", 10), bg="#6A1B9A", fg="#E1BEE7").pack(anchor="w")
        
        # Индикатор администратора
        if self.is_admin():
            admin_label = tk.Label(header_frame, text="👑 АДМИН", font=("Arial", 10, "bold"),
                                 bg="#FFD700", fg="#8B4513", padx=5, pady=2)
            admin_label.pack(side="left", padx=10)
        
        back_btn = tk.Button(header_frame, text="◀ Назад", font=("Arial", 10, "bold"),
                           bg="#9C27B0", fg="white", width=10, height=1,
                           command=self.return_to_location, relief="raised", bd=1)
        back_btn.pack(side="right", padx=15, pady=10)
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(self.root, bg="#F3E5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#F3E5F5", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#F3E5F5")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Левая колонка - статистики
        left_column = tk.Frame(scrollable_frame, bg="#F3E5F5", width=250)
        left_column.pack(side="left", fill="both", padx=(0, 10))
        
        # Карточка здоровья
        hp_card = tk.Frame(left_column, bg="#FFEBEE", relief="ridge", bd=2)
        hp_card.pack(fill="x", pady=(0, 10))
        
        hp_header = tk.Frame(hp_card, bg="#D32F2F", height=30)
        hp_header.pack(fill="x")
        tk.Label(hp_header, text="❤️ ЗДОРОВЬЕ", font=("Arial", 12, "bold"), 
                bg="#D32F2F", fg="white").pack(pady=5)
        
        hp_content = tk.Frame(hp_card, bg="#FFEBEE", padx=15, pady=10)
        hp_content.pack(fill="x")
        
        tk.Label(hp_content, text="Текущее:", font=("Arial", 10, "bold"),
                bg="#FFEBEE", fg="#C62828").pack(anchor="w")
        
        hp_current = tk.Label(hp_content, 
                            text=f"{self.player_data.get('hp', 0)} / {self.player_data.get('hp_max', 100)}",
                            font=("Arial", 14, "bold"), bg="#FFEBEE", fg="#D32F2F")
        hp_current.pack(anchor="w", pady=(0, 5))
        
        hp_percent = (self.player_data.get("hp", 0) / self.player_data.get("hp_max", 100)) * 100
        hp_progress = ttk.Progressbar(hp_content, length=200, maximum=100, value=hp_percent,
                                     style="red.Horizontal.TProgressbar")
        hp_progress.pack(fill="x", pady=5)
        
        # Карточка маны
        mp_card = tk.Frame(left_column, bg="#E3F2FD", relief="ridge", bd=2)
        mp_card.pack(fill="x", pady=(0, 10))
        
        mp_header = tk.Frame(mp_card, bg="#1976D2", height=30)
        mp_header.pack(fill="x")
        tk.Label(mp_header, text="💙 МАНА", font=("Arial", 12, "bold"), 
                bg="#1976D2", fg="white").pack(pady=5)
        
        mp_content = tk.Frame(mp_card, bg="#E3F2FD", padx=15, pady=10)
        mp_content.pack(fill="x")
        
        tk.Label(mp_content, text="Текущая:", font=("Arial", 10, "bold"),
                bg="#E3F2FD", fg="#1565C0").pack(anchor="w")
        
        mp_current = tk.Label(mp_content, 
                            text=f"{self.player_data.get('mp', 0)} / {self.player_data.get('mp_max', 20)}",
                            font=("Arial", 14, "bold"), bg="#E3F2FD", fg="#1976D2")
        mp_current.pack(anchor="w", pady=(0, 5))
        
        mp_percent = (self.player_data.get("mp", 0) / self.player_data.get("mp_max", 20)) * 100
        mp_progress = ttk.Progressbar(mp_content, length=200, maximum=100, value=mp_percent,
                                     style="blue.Horizontal.TProgressbar")
        mp_progress.pack(fill="x", pady=5)
        
        # Карточка характеристик
        stats_card = tk.Frame(left_column, bg="#E8F5E8", relief="ridge", bd=2)
        stats_card.pack(fill="x", pady=(0, 10))
        
        stats_header = tk.Frame(stats_card, bg="#388E3C", height=30)
        stats_header.pack(fill="x")
        tk.Label(stats_header, text="⚔️ ХАРАКТЕРИСТИКИ", font=("Arial", 12, "bold"), 
                bg="#388E3C", fg="white").pack(pady=5)
        
        stats = self.calculate_stats()
        stats_content = tk.Frame(stats_card, bg="#E8F5E8", padx=15, pady=10)
        stats_content.pack(fill="x")
        
        dmg_frame = tk.Frame(stats_content, bg="#E8F5E8")
        dmg_frame.pack(fill="x", pady=2)
        tk.Label(dmg_frame, text="⚔️ Урон:", font=("Arial", 11, "bold"),
                bg="#E8F5E8", width=12, anchor="w").pack(side="left", padx=5)
        tk.Label(dmg_frame, text=str(stats["damage"]), font=("Arial", 12, "bold"),
                bg="#E8F5E8", fg="#C62828").pack(side="right", padx=5)
        
        armor_frame = tk.Frame(stats_content, bg="#E8F5E8")
        armor_frame.pack(fill="x", pady=2)
        tk.Label(armor_frame, text="🛡️ Броня:", font=("Arial", 11, "bold"),
                bg="#E8F5E8", width=12, anchor="w").pack(side="left", padx=5)
        tk.Label(armor_frame, text=str(stats["armor"]), font=("Arial", 12, "bold"),
                bg="#E8F5E8", fg="#2E7D32").pack(side="right", padx=5)
        
        # === ВЕС ИНВЕНТАРЯ ===
        weight_card = tk.Frame(stats_content, bg="#E8F5E8", relief="flat", padx=10, pady=8)
        weight_card.pack(fill="x", pady=(0, 10))
        
        # Заголовок
        weight_header = tk.Frame(weight_card, bg="#E8F5E8")
        weight_header.pack(fill="x", pady=(0, 5))
        
        tk.Label(weight_header, text="🎒 ВМЕСТИМОСТЬ", font=("Arial", 10, "bold"),
                bg="#E8F5E8", fg="#5D4037").pack(side="left")
        
        # Текущий вес/вместимость
        full_weight = self.calculate_full_inventory_weight()
        bag_capacity = self.get_current_bag_capacity()
        
        weight_value_frame = tk.Frame(weight_card, bg="#E8F5E8")
        weight_value_frame.pack(fill="x", pady=(0, 8))
        
        tk.Label(weight_value_frame, text="Вес:", font=("Arial", 10),
                bg="#E8F5E8", width=8, anchor="w").pack(side="left", padx=5)
        tk.Label(weight_value_frame, text=f"{full_weight:.1f} / {bag_capacity:.1f} кг", 
                font=("Arial", 11, "bold"), bg="#E8F5E8", fg="#2196F3").pack(side="right", padx=5)
        
        # Прогресс-бар грузоподъемности (исправленный)
        capacity_progress_frame = tk.Frame(weight_card, bg="#E0E0E0", height=12, relief="sunken", bd=1)
        capacity_progress_frame.pack(fill="x", pady=2)
        capacity_progress_frame.pack_propagate(False)
        
        # Правильный расчет заполнения
        if bag_capacity > 0:
            fill_percent = min(100, (full_weight / bag_capacity) * 100)
        else:
            fill_percent = 0
            
        # Цвет заполнения в зависимости от загрузки
        if fill_percent < 70:
            fill_color = "#4CAF50"  # Зеленый
        elif fill_percent < 90:
            fill_color = "#FF9800"  # Оранжевый
        else:
            fill_color = "#f44336"  # Красный
            
        fill_width = min(int(fill_percent * 1.5), 150)
        tk.Frame(capacity_progress_frame, bg=fill_color, width=fill_width).pack(side="left", fill="y")
        
        # Прогресс увеличения вместимости с уровнями (исправленный)
        capacity_info_frame = tk.Frame(weight_card, bg="#E8F5E8")
        capacity_info_frame.pack(fill="x", pady=(5, 0))
        
        current_level = self.player_data.get("level", 1)
        max_level = self.max_level  # Должно быть определено в __init__ как 50
        
        if current_level < max_level:
            next_level = current_level + 1
            next_capacity = self.get_bag_capacity_for_level(next_level)
            capacity_increase = next_capacity - bag_capacity
            
            tk.Label(capacity_info_frame, 
                    text=f"Ур. {next_level}: +{capacity_increase:.1f} кг → {next_capacity:.1f} кг",
                    font=("Arial", 8), bg="#E8F5E8", fg="#616161").pack(anchor="w")
        else:
            tk.Label(capacity_info_frame, text="Макс. уровень достигнут!",
                    font=("Arial", 8, "bold"), bg="#E8F5E8", fg="#4CAF50").pack(anchor="w")
        
        # Карточка уровня и опыта
        level_card = tk.Frame(left_column, bg="#EDE7F6", relief="ridge", bd=2)
        level_card.pack(fill="x", pady=(0, 10))
        
        level_header = tk.Frame(level_card, bg="#7B1FA2", height=25)
        level_header.pack(fill="x")
        tk.Label(level_header, text="📊 УРОВЕНЬ", font=("Arial", 11, "bold"), 
                bg="#7B1FA2", fg="white").pack(pady=3)
        
        level_content = tk.Frame(level_card, bg="#EDE7F6", padx=10, pady=10)
        level_content.pack(fill="x")
        
        # Создаем контейнер для виджета уровня
        self.character_level_widgets = {}
        level_widget_container = tk.Frame(level_content, bg="#EDE7F6")
        level_widget_container.pack(fill="x")
        self.character_level_widgets['character'] = level_widget_container
        
        # Инициализируем виджет
        self.refresh_level_widget(level_widget_container)
        
        # Кнопка тестирования (только для админа) - можно удалить в релизе
        if self.is_admin():
            test_frame = tk.Frame(level_content, bg="#EDE7F6")
            test_frame.pack(fill="x", pady=(5, 0))
            
            tk.Button(test_frame, text="➕ 100 опыта", font=("Arial", 8),
                     bg="#4CAF50", fg="white", width=10,
                     command=lambda: self.add_experience(100)).pack(side="left", padx=2)
            
            tk.Button(test_frame, text="🎯 Получить уровень", font=("Arial", 8),
                     bg="#2196F3", fg="white", width=15,
                     command=lambda: self.add_experience(
                         self.calculate_exp_for_level(self.player_data.get("level", 1))
                     )).pack(side="left", padx=2)

        # Карточка класса
        class_card = tk.Frame(left_column, bg="#EDE7F6", relief="ridge", bd=2)
        class_card.pack(fill="x", pady=(10, 0))
        
        class_header = tk.Frame(class_card, bg="#5E35B1", height=25)
        class_header.pack(fill="x")
        tk.Label(class_header, text="🎭 КЛАСС", font=("Arial", 11, "bold"), 
                bg="#5E35B1", fg="white").pack(pady=3)
        
        class_content = tk.Frame(class_card, bg="#EDE7F6", padx=10, pady=8)
        class_content.pack(fill="x")
        
        class_desc = {
            "Воин": "⚔️ Сильный воин с высоким здоровьем и уроном в ближнем бою.",
            "Маг": "🔮 Могущественный маг, использующий ману для магических атак.",
            "Охотник": "🏹 Ловкий стрелок, специализирующийся на дальнем бое."
        }.get(player_class, "Неизвестный класс")
        
        tk.Label(class_content, text=class_desc, font=("Arial", 9), 
                bg="#EDE7F6", fg="#5D4037", wraplength=220, justify="left").pack()
        
        # Правая колонка - экипировка
        right_column = tk.Frame(scrollable_frame, bg="#F3E5F5")
        right_column.pack(side="right", fill="both", expand=True)
        
        equip_header = tk.Frame(right_column, bg="#5E35B1", height=35)
        equip_header.pack(fill="x", pady=(0, 10))
        tk.Label(equip_header, text="🎽 ЭКИПИРОВКА", font=("Arial", 13, "bold"), 
                bg="#5E35B1", fg="white").pack(pady=7)
        
        equip_container = tk.Frame(right_column, bg="#F3E5F5")
        equip_container.pack(fill="both", expand=True)
        
        slots = [
            ("head", "Голова", "👑", 0, 0),
            ("body", "Тело", "👕", 1, 0),
            ("hands", "Руки", "🧤", 0, 1),
            ("feet", "Ноги", "👢", 1, 1),
            ("weapon", "Оружие", "⚔️", 0, 2)
        ]
        
        self.equip_slots = {}
        items = self.load_items()
        
        for slot_key, slot_name, slot_icon, row, col in slots:
            slot_frame = tk.Frame(equip_container, bg="white", relief="groove", bd=2, width=120, height=120)
            slot_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")
            slot_frame.grid_propagate(False)
            equip_container.grid_columnconfigure(col, weight=1)
            
            slot_header = tk.Frame(slot_frame, bg="#7E57C2", height=25)
            slot_header.pack(fill="x")
            tk.Label(slot_header, text=f"{slot_icon} {slot_name}", 
                    font=("Arial", 10, "bold"), bg="#7E57C2", fg="white").pack(pady=2)
            
            slot_content = tk.Frame(slot_frame, bg="white", padx=10, pady=10)
            slot_content.pack(fill="both", expand=True)
            
            equipped_item = self.player_data.get("equipped", {}).get(slot_key)
            if equipped_item:
                if isinstance(equipped_item, dict):
                    item = equipped_item
                else:
                    item = items.get(equipped_item, {})
                
                if item:
                    tk.Label(slot_content, text=item.get("icon", "📦"), 
                            font=("Arial", 20), bg="white").pack(pady=(0, 5))
                    
                    item_name = item.get("name", "Предмет")
                    if len(item_name) > 10:
                        item_name = item_name[:10] + "..."
                    
                    tk.Label(slot_content, text=item_name, 
                            font=("Arial", 9, "bold"), bg="white", wraplength=100).pack()
                    
                    if slot_key == "weapon":
                        tk.Label(slot_content, text=f"⚔️ {item.get('damage', 0)} урона", 
                                font=("Arial", 8), bg="white", fg="#C62828").pack()
                    else:
                        tk.Label(slot_content, text=f"🛡️ {item.get('defense', 0)} защита", 
                                font=("Arial", 8), bg="white", fg="#2E7D32").pack()
                    
                    # Добавьте отображение требования уровня
                    if item.get("level_requirement", 1) > 1:
                        level_req = item.get("level_requirement", 1)
                        tk.Label(slot_content, text=f"📊 Ур. {level_req}", 
                        font=("Arial", 7), bg="white", fg="#7B1FA2").pack()

                    tk.Button(slot_content, text="🔽 Снять", font=("Arial", 8),
                             bg="#f44336", fg="white", width=10,
                             command=lambda s=slot_key: self.unequip_item(s)).pack(pady=(5, 0))
                else:
                    tk.Label(slot_content, text="┄", font=("Arial", 24), 
                            bg="white", fg="#BDBDBD").pack(pady=(10, 5))
                    tk.Label(slot_content, text="Пусто", font=("Arial", 9), 
                            bg="white", fg="#757575").pack()
                    
                    tk.Button(slot_content, text="🎽 Экип.", font=("Arial", 8),
                             bg="#4CAF50", fg="white", width=10,
                             command=lambda s=slot_key: self.show_equip_window(s)).pack(pady=(5, 0))
            else:
                tk.Label(slot_content, text="┄", font=("Arial", 24), 
                        bg="white", fg="#BDBDBD").pack(pady=(10, 5))
                tk.Label(slot_content, text="Пусто", font=("Arial", 9), 
                        bg="white", fg="#757575").pack()
                
                tk.Button(slot_content, text="🎽 Экип.", font=("Arial", 8),
                         bg="#4CAF50", fg="white", width=10,
                         command=lambda s=slot_key: self.show_equip_window(s)).pack(pady=(5, 0))
            
            self.equip_slots[slot_key] = slot_frame
        
        # Кнопки управления
        manage_frame = tk.Frame(right_column, bg="#F3E5F5", pady=15)
        manage_frame.pack(fill="x", side="bottom", pady=(15, 0))
        
        tk.Button(manage_frame, text="✨ Умения", font=("Arial", 10, "bold"),
                 bg="#FF9800", fg="white", width=25,
                 command=self.show_abilities).pack(pady=5)
        
        tk.Button(manage_frame, text="📦 Управление экипировкой", font=("Arial", 10, "bold"),
                 bg="#5E35B1", fg="white", width=25,
                 command=self.show_equip_window_full).pack(pady=5)
        
        tk.Button(manage_frame, text="🎒 Открыть инвентарь", font=("Arial", 10, "bold"),
                 bg="#FF9800", fg="white", width=25,
                 command=self.show_inventory).pack(pady=5)
        
        if self.is_admin():
            tk.Button(manage_frame, text="🛠 Редактор предметов (F2)", font=("Arial", 10, "bold"),
                     bg="#9C27B0", fg="white", width=25,
                     command=lambda: self.open_contextual_editor()).pack(pady=5)
        
        # Функция для колесика мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        self.create_hamburger_button()
        
        if not self.regeneration_timer:
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)

    # ================ УМЕНИЯ ================
    def show_abilities(self):
        """Показать интерфейс умений"""
        self.current_screen = "abilities"
        self.clear_window()
        
        # Заголовок
        header_frame = tk.Frame(self.root, bg="#FF9800", height=70, relief="raised", bd=3)
        header_frame.pack(fill="x", side="top")
        
        tk.Label(header_frame, text="✨", font=("Arial", 28), 
                bg="#FF9800", fg="white").pack(side="left", padx=(15, 5), pady=10)
        
        title_frame = tk.Frame(header_frame, bg="#FF9800")
        title_frame.pack(side="left", fill="y", pady=10)
        
        tk.Label(title_frame, text="СИСТЕМА УМЕНИЙ", font=("Arial", 16, "bold"), 
                bg="#FF9800", fg="white").pack(anchor="w")
        
        tk.Label(title_frame, text=f"Класс: {self.player_data.get('class', 'Неизвестно')}", 
                font=("Arial", 10), bg="#FF9800", fg="#FFECB3").pack(anchor="w")
        
        back_btn = tk.Button(header_frame, text="◀ Назад", font=("Arial", 10, "bold"),
                           bg="#E65100", fg="white", width=10, height=2,
                           command=self.return_to_location, relief="raised", bd=2)
        back_btn.pack(side="right", padx=15, pady=10)
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(self.root, bg="#FFF3E0")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#FFF3E0", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#FFF3E0")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Экипированные умения
        equipped_frame = tk.Frame(scrollable_frame, bg="#FFF3E0", pady=10)
        equipped_frame.pack(fill="x", padx=5)
        
        tk.Label(equipped_frame, text="🎯 ЭКИПИРОВАННЫЕ УМЕНИЯ", font=("Arial", 12, "bold"),
                bg="#FFF3E0", fg="#E65100").pack(anchor="w", pady=(0, 10))
        
        slots_frame = tk.Frame(equipped_frame, bg="#FFF3E0")
        slots_frame.pack(fill="x", pady=5)
        
        self.ability_slots = []
        for i in range(3):
            slot_frame = tk.Frame(slots_frame, bg="#FFE0B2", relief="groove", bd=2, 
                                 width=150, height=100)
            slot_frame.pack(side="left", fill="both", expand=True, padx=5, pady=5)
            slot_frame.pack_propagate(False)
            
            slot_label = tk.Label(slot_frame, text=f"Слот {i+1}", font=("Arial", 10),
                                 bg="#FFE0B2", fg="#795548")
            slot_label.pack(pady=5)
            
            ability_content = tk.Frame(slot_frame, bg="#FFE0B2")
            ability_content.pack(fill="both", expand=True)
            
            if i < len(self.equipped_abilities):
                ab_id = self.equipped_abilities[i]
                if ab_id in self.abilities:
                    ability = self.abilities[ab_id]
                    tk.Label(ability_content, text=ability.icon, font=("Arial", 20),
                            bg="#FFE0B2").pack(pady=2)
                    tk.Label(ability_content, text=ability.name, font=("Arial", 9),
                            bg="#FFE0B2", wraplength=120).pack()
                    
                    tk.Button(ability_content, text="🔽 Снять", font=("Arial", 8),
                             bg="#f44336", fg="white", width=10,
                             command=lambda idx=i: self.unequip_ability(idx)).pack(pady=5)
                else:
                    tk.Label(ability_content, text="Пусто", font=("Arial", 9),
                            bg="#FFE0B2", fg="#795548").pack(pady=20)
            else:
                tk.Label(ability_content, text="Пусто", font=("Arial", 9),
                        bg="#FFE0B2", fg="#795548").pack(pady=20)
            
            self.ability_slots.append(slot_frame)
        
        separator = tk.Frame(scrollable_frame, bg="#FFCC80", height=3)
        separator.pack(fill="x", pady=20, padx=10)
        
        # Доступные умения
        available_frame = tk.Frame(scrollable_frame, bg="#FFF3E0", pady=10)
        available_frame.pack(fill="x", padx=5)
        
        tk.Label(available_frame, text="📚 ДОСТУПНЫЕ УМЕНИЯ", font=("Arial", 12, "bold"),
                bg="#FFF3E0", fg="#5D4037").pack(anchor="w", pady=(0, 10))
        
        player_class = self.player_data.get("class")
        has_abilities = False
        
        for ab_id, ability in self.abilities.items():
            if ability.class_requirement == player_class:
                has_abilities = True
                ability_card = tk.Frame(available_frame, bg="white", relief="raised", bd=2, padx=10, pady=10)
                ability_card.pack(fill="x", pady=5)
                
                top_frame = tk.Frame(ability_card, bg="white")
                top_frame.pack(fill="x", pady=(0, 5))
                
                tk.Label(top_frame, text=ability.icon, font=("Arial", 24),
                        bg="white").pack(side="left", padx=(0, 10))
                
                info_frame = tk.Frame(top_frame, bg="white")
                info_frame.pack(side="left", fill="both", expand=True)
                
                tk.Label(info_frame, text=ability.name, font=("Arial", 11, "bold"),
                        bg="white").pack(anchor="w")
                
                stats_frame = tk.Frame(info_frame, bg="white")
                stats_frame.pack(fill="x", pady=2)
                
                tk.Label(stats_frame, text=f"🔁 Перезарядка: {ability.cooldown} ход.", 
                        font=("Arial", 8), bg="white", fg="#757575").pack(side="left", padx=(0, 10))
                tk.Label(stats_frame, text=f"💙 Мана: {ability.mana_cost}", 
                        font=("Arial", 8), bg="white", fg="#2196F3").pack(side="left")
                
                desc_frame = tk.Frame(ability_card, bg="#F5F5F5", padx=5, pady=5)
                desc_frame.pack(fill="x", pady=5)
                
                tk.Label(desc_frame, text=ability.description, font=("Arial", 9),
                        bg="#F5F5F5", fg="#5D4037", wraplength=450, justify="left").pack()
                
                btn_frame = tk.Frame(ability_card, bg="white")
                btn_frame.pack(fill="x", pady=(5, 0))
                
                if ability.is_equipped:
                    try:
                        idx = self.equipped_abilities.index(ab_id)
                        tk.Button(btn_frame, text=f"🔽 Снять (слот {idx+1})", 
                                 font=("Arial", 9, "bold"), bg="#f44336", fg="white",
                                 command=lambda a_id=ab_id: self.unequip_ability_by_id(a_id)).pack(side="left", padx=2)
                    except ValueError:
                        ability.is_equipped = False
                        tk.Button(btn_frame, text="🎽 Экипировать", 
                                 font=("Arial", 9, "bold"), bg="#4CAF50", fg="white",
                                 command=lambda a_id=ab_id: self.equip_ability(a_id)).pack(side="left", padx=2)
                else:
                    tk.Button(btn_frame, text="🎽 Экипировать", 
                             font=("Arial", 9, "bold"), bg="#4CAF50", fg="white",
                             command=lambda a_id=ab_id: self.equip_ability(a_id)).pack(side="left", padx=2)
        
        if not has_abilities:
            empty_frame = tk.Frame(available_frame, bg="#FFF3E0", height=100)
            empty_frame.pack(fill="both", expand=True, pady=20)
            
            tk.Label(empty_frame, text="❌", font=("Arial", 40), 
                    bg="#FFF3E0", fg="#BCAAA4").pack(pady=10)
            tk.Label(empty_frame, text="Нет доступных умений", font=("Arial", 14, "bold"), 
                    bg="#FFF3E0", fg="#795548").pack(pady=5)
            tk.Label(empty_frame, text="Для вашего класса умения не найдены", 
                    font=("Arial", 9), bg="#FFF3E0", fg="#A1887F").pack()
        
        tip_frame = tk.Frame(scrollable_frame, bg="#FFECB3", pady=10)
        tip_frame.pack(fill="x", pady=(20, 0))
        
        tk.Label(tip_frame, text="💡 Совет: Можно экипировать до 3 умений. Используйте их в бою!",
                font=("Arial", 9), bg="#FFECB3", fg="#5D4037").pack()
        
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        self.create_hamburger_button()
        
        if not self.regeneration_timer:
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)

    def equip_ability(self, ability_id):
        """Экипировать умение"""
        if ability_id not in self.abilities:
            return
        
        ability = self.abilities[ability_id]
        
        if ability.class_requirement != self.player_data.get("class"):
            self.notification.show_notification(
                f"Это умение могут использовать только {ability.class_requirement}!",
                "warning",
                3000
            )
            return
        
        if ability.is_equipped:
            self.notification.show_notification("Это умение уже экипировано!", "info", 3000)
            return
        
        if len(self.equipped_abilities) >= 3:
            self.notification.show_notification(
                "Все слоты умений заняты! Снимите умение чтобы освободить слот.",
                "warning",
                3000
            )
            return
        
        ability.is_equipped = True
        self.equipped_abilities.append(ability_id)
        self.player_data["equipped_abilities"] = self.equipped_abilities
        self.save_current_player()
        
        self.notification.show_notification(
            f"Умение экипировано: {ability.name}",
            "success",
            2000
        )
        self.show_abilities()

    def unequip_ability(self, slot_index):
        """Снять умение из слота"""
        if slot_index < len(self.equipped_abilities):
            ability_id = self.equipped_abilities[slot_index]
            if ability_id in self.abilities:
                self.abilities[ability_id].is_equipped = False
            
            self.equipped_abilities.pop(slot_index)
            self.player_data["equipped_abilities"] = self.equipped_abilities
            self.save_current_player()
            
            self.show_animated_message("Умение снято", "#FF9800", 1500)
            self.show_abilities()

    def unequip_ability_by_id(self, ability_id):
        """Снять умение по ID"""
        if ability_id in self.equipped_abilities:
            idx = self.equipped_abilities.index(ability_id)
            self.unequip_ability(idx)

# ================ ИНТЕРФЕЙС ИНВЕНТАРЯ (ПЕРЕРАБОТАННЫЙ) ================
    def show_inventory(self):
        """Показать интерфейс инвентаря"""
        self.current_screen = "inventory"
        self.clear_window()
        
        # === ЗАГОЛОВОК СТИЛИЗОВАННЫЙ ===
        header_frame = tk.Frame(self.root, bg="#FF9800", height=70, relief="raised", bd=3)
        header_frame.pack(fill="x", side="top")
        
        tk.Label(header_frame, text="🎒", font=("Arial", 28), 
                bg="#FF9800", fg="white").pack(side="left", padx=(15, 5), pady=10)
        
        title_frame = tk.Frame(header_frame, bg="#FF9800")
        title_frame.pack(side="left", fill="y", pady=10)
        
        tk.Label(title_frame, text="СУМКА ИНВЕНТАРЯ", font=("Arial", 16, "bold"), 
                bg="#FF9800", fg="white").pack(anchor="w")
        
        stats_frame = tk.Frame(title_frame, bg="#FF9800")
        stats_frame.pack(anchor="w")
        
        # Вес инвентаря (с экипированными предметами)
        total_weight = self.calculate_full_inventory_weight()
        chest_weight = self.calculate_chest_weight()
        bag_capacity = self.get_current_bag_capacity()  # <-- ДИНАМИЧЕСКАЯ
        chest_capacity = self.get_chest_capacity()      # 100.0 кг
        
        tk.Label(stats_frame, text=f"Вместимость: ", font=("Arial", 10), 
                bg="#FF9800", fg="#FFECB3").pack(side="left")
        tk.Label(stats_frame, text=f"{total_weight:.1f}/{bag_capacity:.1f} кг", 
                font=("Arial", 10, "bold"), bg="#FF9800", fg="white").pack(side="left")
        
        # Вес сундука показываем рядом
        tk.Label(stats_frame, text=" | ", font=("Arial", 10), 
                bg="#FF9800", fg="white").pack(side="left")
        tk.Label(stats_frame, text=f"Сундук: {chest_weight:.1f}/{chest_capacity:.1f} кг", 
                font=("Arial", 10), bg="#FF9800", fg="#FFECB3").pack(side="left")
        
        back_btn = tk.Button(header_frame, text="◀ Назад", font=("Arial", 10, "bold"),
                           bg="#E65100", fg="white", width=10, height=2,
                           command=self.return_to_location, relief="raised", bd=2)
        back_btn.pack(side="right", padx=15, pady=10)

        stats_frame = tk.Frame(title_frame, bg="#FF9800")
        stats_frame.pack(anchor="w")
        
        
        # ДОБАВЬТЕ УРОВЕНЬ В ЗАГОЛОВОК
        tk.Label(stats_frame, text=" | ", font=("Arial", 10), 
                bg="#FF9800", fg="white").pack(side="left")
        
        current_level = self.player_data.get("level", 1)
        tk.Label(stats_frame, text=f"Уровень: {current_level}", font=("Arial", 10, "bold"), 
                bg="#FF9800", fg="#7B1FA2").pack(side="left")
        
        # === ОСНОВНОЙ КОНТЕЙНЕР ===
        main_container = tk.Frame(self.root, bg="#FFF3E0")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # === ПАНЕЛЬ БЫСТРОГО ДОСТУПА ===
        if self.is_admin():
            quick_access_frame = tk.Frame(main_container, bg="#FFE0B2", relief="groove", bd=2)
            quick_access_frame.pack(fill="x", pady=(0, 10))
            
            tk.Label(quick_access_frame, text="⚡ АДМИН ПАНЕЛЬ", font=("Arial", 11, "bold"),
                    bg="#FFE0B2", fg="#E65100").pack(pady=5)
            
            quick_btn_frame = tk.Frame(quick_access_frame, bg="#FFE0B2")
            quick_btn_frame.pack(pady=5)
            
            tk.Button(quick_btn_frame, text="🔍 Поиск предметов", font=("Arial", 9, "bold"),
                     bg="#5E35B1", fg="white", width=16,
                     command=self.open_item_search_dialog).pack(side="left", padx=3)
            
            tk.Button(quick_btn_frame, text="📦 Перейти в сундук", font=("Arial", 9, "bold"),
                     bg="#1976D2", fg="white", width=16,
                     command=self.open_chest).pack(side="left", padx=3)
            
            tk.Button(quick_btn_frame, text="👤 К персонажу", font=("Arial", 9, "bold"),
                     bg="#388E3C", fg="white", width=16,
                     command=self.show_character).pack(side="left", padx=3)
            
            tk.Button(quick_btn_frame, text="🛠 Редактор", font=("Arial", 9, "bold"),
                     bg="#9C27B0", fg="white", width=16,
                     command=self.open_contextual_editor).pack(side="left", padx=3)
        else:
            quick_access_frame = tk.Frame(main_container, bg="#FFE0B2", relief="groove", bd=2)
            quick_access_frame.pack(fill="x", pady=(0, 10))
            
            tk.Label(quick_access_frame, text="⚡ БЫСТРЫЙ ДОСТУП", font=("Arial", 11, "bold"),
                    bg="#FFE0B2", fg="#E65100").pack(pady=5)
            
            quick_btn_frame = tk.Frame(quick_access_frame, bg="#FFE0B2")
            quick_btn_frame.pack(pady=5)
            
            tk.Button(quick_btn_frame, text="📦 Перейти в сундук", font=("Arial", 9, "bold"),
                     bg="#1976D2", fg="white", width=16,
                     command=self.open_chest).pack(side="left", padx=3)
            
            tk.Button(quick_btn_frame, text="👤 К персонажу", font=("Arial", 9, "bold"),
                     bg="#388E3C", fg="white", width=16,
                     command=self.show_character).pack(side="left", padx=3)
        
        # === КОНТЕЙНЕР ДЛЯ ПРЕДМЕТОВ С ПРОКРУТКОЙ ===
        items_frame = tk.Frame(main_container, bg="#FFF3E0")
        items_frame.pack(fill="both", expand=True)
        
        canvas = tk.Canvas(items_frame, bg="#FFF3E0", highlightthickness=0)
        scrollbar = tk.Scrollbar(items_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#FFF3E0")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        items_db = self.load_items()
        inventory = self.player_data.get("inventory", [])
        
        if not inventory:
            empty_frame = tk.Frame(scrollable_frame, bg="#FFF3E0", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="📭", font=("Arial", 40), 
                    bg="#FFF3E0", fg="#BCAAA4").pack(pady=10)
            tk.Label(empty_frame, text="Сумка пуста", font=("Arial", 14, "bold"), 
                    bg="#FFF3E0", fg="#795548").pack(pady=5)
            tk.Label(empty_frame, text="Добавьте предметы через поиск или соберите их в мире", 
                    font=("Arial", 9), bg="#FFF3E0", fg="#A1887F").pack()
            
            if self.is_admin():
                tk.Button(empty_frame, text="🔍 Найти предметы", font=("Arial", 10, "bold"),
                         bg="#5E35B1", fg="white", width=20,
                         command=self.open_item_search_dialog).pack(pady=15)
        else:
            row_frame = None
            items_per_row = 2
            
            for i, item in enumerate(inventory):
                if i % items_per_row == 0:
                    row_frame = tk.Frame(scrollable_frame, bg="#FFF3E0")
                    row_frame.pack(fill="x", pady=5, padx=5)
                
                # Проверяем тип элемента - это может быть dict (предмет из лута) или str (ID предмета)
                if isinstance(item, dict):
                    # Это объект предмета из лута
                    item_data = item
                    item_id = item_data.get("id", f"loot_item_{i}")
                    item_type = item_data.get("type", "item")
                else:
                    # Это ID предмета из базы
                    item_id = item
                    item_data = items_db.get(item_id, {"name": item_id, "icon": "📦", "weight": 0.0, "type": "unknown"})
                    item_type = item_data.get("type", "unknown")
                
                # Создаем карточку предмета
                card = tk.Frame(row_frame, bg="white", relief="raised", bd=2)
                card.pack(side="left", fill="both", expand=True, padx=5, ipady=5)
                
                top_frame = tk.Frame(card, bg="white")
                top_frame.pack(fill="x", pady=(8, 5))
                
                tk.Label(top_frame, text=item_data.get("icon", "📦"), font=("Arial", 22), 
                        bg="white").pack(side="left", padx=(10, 5))
                
                info_frame = tk.Frame(top_frame, bg="white")
                info_frame.pack(side="left", fill="x", expand=True)
                
                # Название предмета
                item_name = item_data.get("name", "Предмет")
                # Если это предмет из лута, берем его сгенерированное имя
                if isinstance(item, dict) and "base_item_id" in item_data:
                    base_item = items_db.get(item_data.get("base_item_id"), {})
                    base_name = base_item.get("name", "Предмет")
                    prefix = item_data.get("name_prefix", "")
                    item_name = f"{prefix} {base_name}".strip()
                
                name_frame = tk.Frame(info_frame, bg="white")
                name_frame.pack(fill="x", padx=(0, 10))
                
                name_label = tk.Label(name_frame, text=item_name, font=("Arial", 11, "bold"), 
                                     bg="white", anchor="w")
                name_label.pack(side="left", fill="x", expand=True)
                
                # Проверяем требования (используем существующий метод can_equip_item)
                can_equip_result = self.can_equip_item(item_data)
                can_equip = can_equip_result[0]
                
                # Вес
                weight_label = tk.Label(info_frame, text=f"⚖️ {item_data.get('weight', 0):.1f} кг", 
                                       font=("Arial", 9), bg="white", fg="#795548", anchor="w")
                weight_label.pack(fill="x", padx=(0, 10))
                
                # Требование уровня
                if "level_requirement" in item_data and item_data["level_requirement"] > 1:
                    level_req = item_data["level_requirement"]
                    player_level = self.player_data.get("level", 1)
                    level_color = "#4CAF50" if player_level >= level_req else "#f44336"
                    tk.Label(name_frame, text=f"📊 Уровень: {level_req}", 
                            font=("Arial", 8, "bold"), bg="white", fg=level_color).pack(side="right", padx=(5, 0), pady=(2, 0))
                
                # Тип и характеристики
                type_frame = tk.Frame(info_frame, bg="white")
                type_frame.pack(fill="x", padx=(0, 10), pady=(2, 0))
                
                if item_type == "weapon":
                    type_color = "#D32F2F"
                    type_text = "Оружие"
                    subtype = "⚔️ Ближний" if item_data.get("subtype") == "melee" else "🏹 Дальний"
                    stat_text = f"Урон: {item_data.get('damage', 0)}"
                    
                    # Показываем требование класса
                    class_req = item_data.get("class_requirement")
                    if class_req:
                        req_color = "#4CAF50" if class_req == self.player_data.get("class") else "#f44336"
                        tk.Label(type_frame, text=f"🎭 {class_req}", font=("Arial", 8, "bold"),
                                bg=req_color, fg="white", padx=3, pady=1).pack(side="left", padx=(0, 5))
                    
                elif item_type == "armor":
                    type_color = "#388E3C"
                    subtype_map = {"head": "Голова", "body": "Тело", "hands": "Руки", "feet": "Ноги"}
                    subtype = subtype_map.get(item_data.get("subtype"), "Броня")
                    type_text = "Броня"
                    stat_text = f"Защита: {item_data.get('defense', 0)}"
                elif item_type == "consumable":
                    type_color = "#7B1FA2"
                    type_text = "Расходник"
                    
                    effect = item_data.get("effect", "heal")
                    value = item_data.get("value", 0)
                    
                    if effect == "heal":
                        effect_text = f"💚 +{value} HP"
                    elif effect == "mana":
                        effect_text = f"💙 +{value} MP"
                    else:  # both
                        effect_text = f"💚💙 +{value} HP/MP"
                    
                    subtype = "Зелье"
                    stat_text = effect_text
                else:
                    type_color = "#757575"
                    type_text = "Предмет"
                    subtype = ""
                    stat_text = ""
                
                tk.Label(type_frame, text=type_text, font=("Arial", 8, "bold"),
                        bg=type_color, fg="white", padx=4, pady=1).pack(side="left")
                
                if subtype:
                    tk.Label(type_frame, text=subtype, font=("Arial", 8),
                            bg="white", fg=type_color, padx=4).pack(side="left", padx=(5, 0))
                
                if stat_text:
                    stat_label = tk.Label(info_frame, text=stat_text, font=("Arial", 9, "bold"),
                                         bg="white", fg=type_color, anchor="w")
                    stat_label.pack(fill="x", padx=(0, 10), pady=(2, 0))
                
                # Редкость (для предметов из лута)
                if isinstance(item, dict) and "rarity" in item_data:
                    rarity_frame = tk.Frame(info_frame, bg="white")
                    rarity_frame.pack(fill="x", padx=(0, 10), pady=(2, 0))
                    
                    rarity_colors = {
                        "Обычный": "#757575",
                        "Необычный": "#4CAF50",
                        "Редкий": "#2196F3",
                        "Эпический": "#9C27B0",
                        "Легендарный": "#FF9800"
                    }
                    rarity = item_data.get("rarity", "Обычный")
                    rarity_color = rarity_colors.get(rarity, "#757575")
                    
                    tk.Label(rarity_frame, text=f"★ {rarity}", font=("Arial", 8, "bold"),
                            bg=rarity_color, fg="white", padx=4, pady=1).pack(side="left")
                
                # Кнопки действий
                action_frame = tk.Frame(card, bg="#F5F5F5")
                action_frame.pack(fill="x", padx=5, pady=(5, 8))
                
                if item_type in ["weapon", "armor"]:
                    # Определяем слот для предмета
                    if item_type == "weapon":
                        item_slot = "weapon"
                    else:
                        # Для брони определяем слот по подтипу
                        item_subtype = item_data.get("subtype", "body")
                        if item_subtype in ["head", "body", "hands", "feet"]:
                            item_slot = item_subtype
                        else:
                            item_slot = "body"
                    
                    # Используем проверку can_equip из метода can_equip_item
                    if can_equip:
                        equip_btn = tk.Button(action_frame, text="🎽 Экип.", font=("Arial", 8, "bold"),
                                             bg="#4CAF50", fg="white", width=8,
                                             command=lambda idx=i, slot=item_slot, it=item: self.equip_item_from_inventory(idx, slot, it))
                    else:
                        equip_btn = tk.Button(action_frame, text=can_equip_result[1], font=("Arial", 8),
                                             bg="#757575", fg="white", width=8,
                                             state="disabled")
                    equip_btn.pack(side="left", padx=2)
                
                elif item_type == "consumable":
                    # Кнопка использования расходника
                    use_btn = tk.Button(action_frame, text="🧪 Исп.", font=("Arial", 8, "bold"),
                           bg="#7B1FA2", fg="white", width=8,
                           command=lambda idx=i: self.use_item(idx))
                    use_btn.pack(side="left", padx=2)
                
                tk.Button(action_frame, text="🗑 Выбросить", font=("Arial", 8, "bold"),
                         bg="#f44336", fg="white", width=8,
                         command=lambda idx=i: self.drop_item(idx)).pack(side="left", padx=2)
        
        # === НИЖНЯЯ ПАНЕЛЬ С ИНФОРМАЦИЕЙ ===
        bottom_frame = tk.Frame(self.root, bg="#FFECB3", height=35, relief="raised", bd=1)
        bottom_frame.pack(fill="x", side="bottom", pady=(5, 0))
        
        stats = self.calculate_stats()
        info_text = f"Предметов: {len(inventory)} | ⚔️ Урон: {stats['damage']} | 🛡️ Броня: {stats['armor']}"
        if self.is_admin():
            info_text += " | 👑 АДМИН"
        tk.Label(bottom_frame, text=info_text, font=("Arial", 9), 
                bg="#FFECB3", fg="#5D4037").pack(pady=8)
        
        self.create_hamburger_button()
        
        if not self.regeneration_timer:
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)

    # ================ ДИАЛОГ ПОИСКА ПРЕДМЕТОВ ================
    def open_item_search_dialog(self):
        """Диалог поиска и добавления предметов (только для админа)"""
        if not self.is_admin():
            messagebox.showinfo("Доступ запрещен", "Эта функция доступна только администратору.")
            return
            
        dialog = tk.Toplevel(self.root)
        dialog.title("🔍 Поиск предметов")
        dialog.geometry("600x500")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#5E35B1", height=50)
        header_frame.pack(fill="x")
        tk.Label(header_frame, text="🔍 ПОИСК И ДОБАВЛЕНИЕ ПРЕДМЕТОВ", 
                font=("Arial", 12, "bold"), bg="#5E35B1", fg="white").pack(pady=10)
        
        # Поисковая строка
        search_frame = tk.Frame(dialog, bg="#F5F5F5", padx=10, pady=10)
        search_frame.pack(fill="x")
        
        tk.Label(search_frame, text="Поиск:", bg="#F5F5F5").pack(side="left", padx=(0, 5))
        search_var = tk.StringVar()
        search_entry = tk.Entry(search_frame, textvariable=search_var, width=40)
        search_entry.pack(side="left", padx=5)
        search_entry.focus()
        
        # Фильтр по типу
        filter_frame = tk.Frame(dialog, bg="#F5F5F5", padx=10, pady=5)
        filter_frame.pack(fill="x")
        
        tk.Label(filter_frame, text="Фильтр:", bg="#F5F5F5").pack(side="left", padx=(0, 5))
        filter_var = tk.StringVar(value="Все")
        filter_options = ["Все", "Оружие", "Броня", "Расходники"]
        for opt in filter_options:
            tk.Radiobutton(filter_frame, text=opt, variable=filter_var, value=opt, 
                          bg="#F5F5F5").pack(side="left", padx=5)
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=5)
        
        canvas = tk.Canvas(main_container, bg="#F5F5F5", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#F5F5F5")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        items = self.load_items()
        all_items = list(items.keys())
        
        def filter_items():
            """Фильтрация и отображение предметов"""
            for widget in scrollable_frame.winfo_children():
                widget.destroy()
            
            search_text = search_var.get().lower()
            filter_type = filter_var.get()
            
            filtered_items = []
            for item_id in all_items:
                item = items[item_id]
                matches_search = (search_text in item_id.lower() or 
                                 search_text in item.get("name", "").lower())
                
                matches_filter = (filter_type == "Все" or
                                 (filter_type == "Оружие" and item.get("type") == "weapon") or
                                 (filter_type == "Броня" and item.get("type") == "armor") or
                                 (filter_type == "Расходники" and item.get("type") == "consumable"))
                
                if matches_search and matches_filter:
                    filtered_items.append((item_id, item))
            
            if not filtered_items:
                tk.Label(scrollable_frame, text="❌ Предметы не найдены", 
                        font=("Arial", 12), bg="#F5F5F5", fg="#757575").pack(pady=50)
                return
            
            for item_id, item in filtered_items:
                # Карточка предмета
                card = tk.Frame(scrollable_frame, bg="white", relief="raised", bd=1, padx=10, pady=10)
                card.pack(fill="x", pady=5)
                
                # Левая часть - иконка и информация
                left_frame = tk.Frame(card, bg="white")
                left_frame.pack(side="left", fill="both", expand=True)
                
                # Иконка и название
                top_frame = tk.Frame(left_frame, bg="white")
                top_frame.pack(fill="x")
                
                tk.Label(top_frame, text=item.get("icon", "📦"), font=("Arial", 20), 
                        bg="white").pack(side="left", padx=(0, 10))
                
                name_frame = tk.Frame(top_frame, bg="white")
                name_frame.pack(side="left", fill="both", expand=True)
                
                tk.Label(name_frame, text=item["name"], font=("Arial", 11, "bold"), 
                        bg="white").pack(anchor="w")
                tk.Label(name_frame, text=f"ID: {item_id}", font=("Arial", 9), 
                        bg="white", fg="#757575").pack(anchor="w")
                
                # Статистики
                stats_frame = tk.Frame(left_frame, bg="white")
                stats_frame.pack(fill="x", pady=(5, 0))
                
                if item.get("type") == "weapon":
                    tk.Label(stats_frame, text=f"⚔️ Урон: {item.get('damage', 0)}", 
                            font=("Arial", 9), bg="white", fg="#D32F2F").pack(side="left", padx=(0, 10))
                    if item.get("class_requirement"):
                        tk.Label(stats_frame, text=f"🎭 {item.get('class_requirement')}", 
                                font=("Arial", 9, "bold"), bg="#4CAF50", fg="white", padx=3, pady=1).pack(side="left")
                elif item.get("type") == "armor":
                    tk.Label(stats_frame, text=f"🛡️ Защита: {item.get('defense', 0)}", 
                            font=("Arial", 9), bg="white", fg="#388E3C").pack(side="left", padx=(0, 10))
                elif item.get("type") == "consumable":
                    tk.Label(stats_frame, text=f"🧪 +{item.get('value', 0)} HP", 
                            font=("Arial", 9), bg="white", fg="#7B1FA2").pack(side="left", padx=(0, 10))
                
                tk.Label(stats_frame, text=f"⚖️ {item.get('weight', 0):.1f} кг", 
                        font=("Arial", 9), bg="white", fg="#795548").pack(side="left")
                
                # Правая часть - кнопки
                btn_frame = tk.Frame(card, bg="white")
                btn_frame.pack(side="right")
                
                # Проверяем, есть ли уже предмет в инвентаре
                already_in_inventory = any(
                    (isinstance(inv_item, str) and inv_item == item_id) or 
                    (isinstance(inv_item, dict) and inv_item.get("base_item_id") == item_id)
                    for inv_item in self.player_data["inventory"]
                )
                
                already_in_chest = item_id in self.chest_items
                
                if already_in_inventory:
                    tk.Label(btn_frame, text="✅ В инвентаре", font=("Arial", 9, "bold"),
                            bg="#4CAF50", fg="white", padx=5, pady=2).pack(pady=2)
                else:
                    tk.Button(btn_frame, text="➕ В инвентарь", font=("Arial", 9, "bold"),
                             bg="#2196F3", fg="white", width=12,
                             command=lambda iid=item_id: self._add_item_to_inventory(iid, dialog)).pack(pady=2)
                
                if already_in_chest:
                    tk.Label(btn_frame, text="📦 В сундуке", font=("Arial", 9, "bold"),
                            bg="#FF9800", fg="white", padx=5, pady=2).pack(pady=2)
                else:
                    tk.Button(btn_frame, text="📦 В сундук", font=("Arial", 9, "bold"),
                             bg="#FF9800", fg="white", width=12,
                             command=lambda iid=item_id: self._add_item_to_chest(iid, dialog)).pack(pady=2)
        
        # Привязываем события поиска
        search_var.trace("w", lambda *args: filter_items())
        filter_var.trace("w", lambda *args: filter_items())
        
        # Инициализация списка
        filter_items()
        
        # Кнопка закрытия
        tk.Button(dialog, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=dialog.destroy).pack(pady=10)

    def _add_item_to_inventory(self, item_id, dialog=None):
        """Добавить предмет в инвентарь (вспомогательный метод для поиска)"""
        items_db = self.load_items()
        item_data = items_db.get(item_id)
        
        if not item_data:
            messagebox.showerror("Ошибка", "Предмет не найден!", parent=self.root if not dialog else dialog)
            return False
        
        # Проверяем, не превышает ли вес вместимость
        item_weight = item_data.get("weight", 0)
        
        # Рассчитываем текущий вес инвентаря
        total_weight = self.calculate_full_inventory_weight()
        
        # Получаем текущую вместимость сумки
        bag_capacity = self.get_current_bag_capacity()
        
        # Проверяем, достаточно ли места
        if total_weight + item_weight > bag_capacity:
            messagebox.showwarning(
                "⚠️ Недостаточно места!", 
                f"Не хватает места в сумке!\n"
                f"Требуется: {item_weight:.1f} кг\n"
                f"Свободно: {bag_capacity - total_weight:.1f} кг\n"
                f"Вместимость: {bag_capacity:.1f} кг",
                parent=self.root if not dialog else dialog
            )
            return False
        
        # Добавляем предмет в инвентарь
        self.player_data["inventory"].append(item_id)
        self.save_current_player()
        
        # Показываем уведомление
        self.notification.show_notification(
            f"📦 {item_data.get('name', 'Предмет')} добавлен в сумку",
            "success",
            3000
        )
        
        # Обновляем диалог поиска, если он открыт
        if dialog and dialog.winfo_exists():
            # Перезагружаем список предметов
            for widget in dialog.winfo_children():
                if isinstance(widget, tk.Frame) and widget.winfo_children():
                    # Обновляем отображение
                    dialog.after(100, lambda: self._update_search_dialog(dialog))
        
        return True
    
    def _update_search_dialog(self, dialog):
        """Обновить диалог поиска"""
        # Ищем функцию filter_items и вызываем ее
        for widget in dialog.winfo_children():
            if isinstance(widget, tk.Frame):
                for child in widget.winfo_children():
                    if isinstance(child, tk.Entry):
                        # Триггерим обновление
                        var = child.get()
                        # Вызываем фильтрацию через событие
                        dialog.event_generate('<<FilterUpdate>>')
                        return
    
    def _add_item_to_chest(self, item_id, dialog=None):
        """Добавить предмет в сундук (вспомогательный метод для поиска)"""
        items_db = self.load_items()
        item_data = items_db.get(item_id)
        
        if not item_data:
            messagebox.showerror("Ошибка", "Предмет не найден!", parent=self.root if not dialog else dialog)
            return False
        
        # Проверяем, не превышает ли вес вместимость сундука
        item_weight = item_data.get("weight", 0)
        chest_weight = self.calculate_chest_weight()
        
        # Проверяем, достаточно ли места в сундуке
        if chest_weight + item_weight > self.chest_capacity:
            messagebox.showwarning(
                "⚠️ Недостаточно места!", 
                f"Не хватает места в сундуке!\n"
                f"Требуется: {item_weight:.1f} кг\n"
                f"Свободно: {self.chest_capacity - chest_weight:.1f} кг\n"
                f"Вместимость сундука: {self.chest_capacity:.1f} кг",
                parent=self.root if not dialog else dialog
            )
            return False
        
        # Добавляем предмет в сундук
        self.chest_items.append(item_id)
        self.save_chest()
        
        # Показываем уведомление
        self.notification.show_notification(
            f"📦 {item_data.get('name', 'Предмет')} добавлен в сундук",
            "success",
            3000
        )
        
        # Обновляем диалог поиска, если он открыт
        if dialog and dialog.winfo_exists():
            # Перезагружаем список предметов
            for widget in dialog.winfo_children():
                if isinstance(widget, tk.Frame) and widget.winfo_children():
                    # Обновляем отображение
                    dialog.after(100, lambda: self._update_search_dialog(dialog))
        
        return True

    def discard_item(self, item):
        """Выбросить предмет из инвентаря"""
        if messagebox.askyesno("🗑 Выбросить", "Вы уверены, что хотите выбросить этот предмет?"):
            if isinstance(item, dict):
                # Это объект предмета из лута - ищем по id
                item_id = item.get("id")
                self.player_data["inventory"] = [
                    inv_item for inv_item in self.player_data["inventory"] 
                    if not (isinstance(inv_item, dict) and inv_item.get("id") == item_id)
                ]
            else:
                # Это ID предмета
                if item in self.player_data["inventory"]:
                    self.player_data["inventory"].remove(item)
            
            self.save_current_player()
            self.show_animated_message("Предмет выброшен", "#f44336", 1500)
            self.show_inventory()

    # ================ ЭКИПИРОВКА ПРЕДМЕТОВ ================
    def equip_item(self, slot, item):
        """Экипировать предмет"""
        try:
            # Определяем ID предмета и его данные
            items_db = self.load_items()
            
            if isinstance(item, dict):
                # Это объект предмета из лута
                item_data = item
                item_id = item.get("id")
            else:
                # Это ID предмета
                item_id = item
                item_data = items_db.get(item_id, {})
            
            # Проверяем, может ли игрок экипировать предмет
            can_equip, reason = self.can_equip_item(item_data)
            if not can_equip:
                messagebox.showwarning("⚠️", f"Нельзя экипировать: {reason}")
                return
            
            # Получаем текущую экипировку
            equipped = self.player_data.get("equipped", {})
            
            # Проверяем, экипирован ли уже предмет
            current_equipped = equipped.get(slot)
            if current_equipped:
                # Снимаем текущий предмет
                self.player_data["inventory"].append(current_equipped)
            
            # Экипируем новый предмет
            equipped[slot] = item
            self.player_data["equipped"] = equipped
            
            # Удаляем предмет из инвентаря
            inventory = self.player_data["inventory"]
            if isinstance(item, dict):
                # Это объект предмета из лута - удаляем по ID
                item_id_to_remove = item.get("id")
                self.player_data["inventory"] = [
                    inv_item for inv_item in inventory 
                    if not (isinstance(inv_item, dict) and inv_item.get("id") == item_id_to_remove)
                ]
            else:
                # Это ID предмета - удаляем строку
                if item in inventory:
                    inventory.remove(item)
            
            self.save_current_player()
            self.notification.show_notification(f"Предмет экипирован", "success", 1500)
            
            # Обновляем отображение
            if self.current_screen == "character":
                self.show_character()
            elif self.current_screen == "inventory":
                self.show_inventory()
            else:
                self.show_character()
                
        except Exception as e:
            print(f"⚠️ Ошибка в equip_item: {e}")
            self.notification.show_notification("Ошибка при экипировке!", "error", 2000)
        
        # Обновляем отображение
        if self.current_screen == "character":
            self.show_character()
        elif self.current_screen == "inventory":
            self.show_inventory()
        else:
            self.show_character()

    def unequip_item(self, slot):
        """Снять предмет"""
        try:
            equipped = self.player_data.get("equipped", {})
            
            if slot in equipped:
                item = equipped[slot]
                
                # Проверяем вес инвентаря
                items_db = self.load_items()
                
                if isinstance(item, dict):
                    # Это объект предмета из лута
                    item_weight = item.get("weight", 0)
                else:
                    # Это ID предмета
                    item_data = items_db.get(item, {})
                    item_weight = item_data.get("weight", 0)
                
                current_weight = self.calculate_weight(self.player_data["inventory"])
                bag_capacity = self.get_current_bag_capacity()
                
                if current_weight + item_weight > bag_capacity:
                    messagebox.showwarning("⚠️", "Инвентарь переполнен! Нельзя снять предмет.")
                    return
                
                # Добавляем предмет в инвентарь
                self.player_data["inventory"].append(item)
                
                # Удаляем из экипировки
                del equipped[slot]
                self.player_data["equipped"] = equipped
                
                self.save_current_player()
                self.notification.show_notification(f"Предмет снят", "success", 1500)
                
                # Обновляем отображение
                if self.current_screen == "character":
                    self.show_character()
                elif self.current_screen == "inventory":
                    self.show_inventory()
                else:
                    self.show_character()
                    
        except Exception as e:
            print(f"⚠️ Ошибка в unequip_item: {e}")
            self.notification.show_notification("Ошибка при снятии предмета!", "error", 2000)
            
            # Обновляем отображение
            if self.current_screen == "character":
                self.show_character()
            elif self.current_screen == "inventory":
                self.show_inventory()
            else:
                self.show_character()

    def show_equip_window(self, slot=None):
        """Показать окно экипировки предметов"""
        dialog = tk.Toplevel(self.root)
        dialog.title(f"🎽 Экипировка {' - ' + slot if slot else ''}")
        dialog.geometry("500x450")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#7B1FA2", height=50)
        header_frame.pack(fill="x")
        
        title_text = f"🎽 ЭКИПИРОВКА"
        if slot:
            slot_names = {
                "head": "Голова", "body": "Тело", 
                "hands": "Руки", "feet": "Ноги", "weapon": "Оружие"
            }
            title_text += f" - {slot_names.get(slot, slot)}"
        
        tk.Label(header_frame, text=title_text, font=("Arial", 12, "bold"), 
                bg="#7B1FA2", fg="white").pack(pady=10)
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#F5F5F5", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#F5F5F5")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        items_db = self.load_items()
        inventory = self.player_data.get("inventory", [])
        
        # Фильтруем предметы по слоту, если указан
        filtered_items = []
        
        for item in inventory:
            if isinstance(item, dict):
                # Это объект предмета из лута
                item_type = item.get("type", "unknown")
                item_subtype = item.get("subtype", "")
                
                if slot == "weapon" and item_type == "weapon":
                    filtered_items.append(item)
                elif slot == "head" and item_type == "armor" and item_subtype == "head":
                    filtered_items.append(item)
                elif slot == "body" and item_type == "armor" and item_subtype == "body":
                    filtered_items.append(item)
                elif slot == "hands" and item_type == "armor" and item_subtype == "hands":
                    filtered_items.append(item)
                elif slot == "feet" and item_type == "armor" and item_subtype == "feet":
                    filtered_items.append(item)
                elif not slot:  # Показываем все, если слот не указан
                    filtered_items.append(item)
            else:
                # Это ID предмета
                item_data = items_db.get(item, {})
                item_type = item_data.get("type", "unknown")
                item_subtype = item_data.get("subtype", "")
                
                if slot == "weapon" and item_type == "weapon":
                    filtered_items.append(item)
                elif slot == "head" and item_type == "armor" and item_subtype == "head":
                    filtered_items.append(item)
                elif slot == "body" and item_type == "armor" and item_subtype == "body":
                    filtered_items.append(item)
                elif slot == "hands" and item_type == "armor" and item_subtype == "hands":
                    filtered_items.append(item)
                elif slot == "feet" and item_type == "armor" and item_subtype == "feet":
                    filtered_items.append(item)
                elif not slot:  # Показываем все, если слот не указан
                    filtered_items.append(item)
        
        if not filtered_items:
            empty_frame = tk.Frame(scrollable_frame, bg="#F5F5F5", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="📭", font=("Arial", 40), 
                    bg="#F5F5F5", fg="#BCAAA4").pack(pady=10)
            
            if slot:
                tk.Label(empty_frame, text=f"Нет подходящих предметов для слота", font=("Arial", 14, "bold"), 
                        bg="#F5F5F5", fg="#795548").pack(pady=5)
            else:
                tk.Label(empty_frame, text="Нет предметов для экипировки", font=("Arial", 14, "bold"), 
                        bg="#F5F5F5", fg="#795548").pack(pady=5)
            
            tk.Button(empty_frame, text="❌ Закрыть", font=("Arial", 10, "bold"),
                     bg="#757575", fg="white", width=15,
                     command=dialog.destroy).pack(pady=15)
        else:
            for item in filtered_items:
                # Определяем данные предмета
                if isinstance(item, dict):
                    item_data = item
                else:
                    item_data = items_db.get(item, {})
                
                # Карточка предмета
                item_card = tk.Frame(scrollable_frame, bg="white", relief="raised", bd=2, padx=10, pady=10)
                item_card.pack(fill="x", pady=5)
                
                # Левая часть - информация о предмете
                left_frame = tk.Frame(item_card, bg="white")
                left_frame.pack(side="left", fill="both", expand=True)
                
                # Иконка и название
                top_frame = tk.Frame(left_frame, bg="white")
                top_frame.pack(fill="x")
                
                tk.Label(top_frame, text=item_data.get("icon", "📦"), font=("Arial", 20), 
                        bg="white").pack(side="left", padx=(0, 10))
                
                name_frame = tk.Frame(top_frame, bg="white")
                name_frame.pack(side="left", fill="both", expand=True)
                
                item_name = item_data.get("name", "Предмет")
                tk.Label(name_frame, text=item_name, font=("Arial", 11, "bold"), 
                        bg="white").pack(anchor="w")
                
                # Статистики
                stats_frame = tk.Frame(left_frame, bg="white")
                stats_frame.pack(fill="x", pady=(5, 0))
                
                if item_data.get("type") == "weapon":
                    tk.Label(stats_frame, text=f"⚔️ Урон: {item_data.get('damage', 0)}", 
                            font=("Arial", 9), bg="white", fg="#D32F2F").pack(side="left", padx=(0, 10))
                    if item_data.get("class_requirement"):
                        req_color = "#4CAF50" if item_data.get("class_requirement") == self.player_data.get("class") else "#f44336"
                        tk.Label(stats_frame, text=f"🎭 {item_data.get('class_requirement')}", 
                                font=("Arial", 9, "bold"), bg=req_color, fg="white", padx=3, pady=1).pack(side="left")
                elif item_data.get("type") == "armor":
                    tk.Label(stats_frame, text=f"🛡️ Защита: {item_data.get('defense', 0)}", 
                            font=("Arial", 9), bg="white", fg="#388E3C").pack(side="left", padx=(0, 10))
                    slot_map = {"head": "Голова", "body": "Тело", "hands": "Руки", "feet": "Ноги"}
                    slot_name = slot_map.get(item_data.get("subtype", ""), "")
                    if slot_name:
                        tk.Label(stats_frame, text=f"📌 {slot_name}", 
                                font=("Arial", 9), bg="white", fg="#7B1FA2").pack(side="left", padx=(0, 10))
                
                tk.Label(stats_frame, text=f"⚖️ {item_data.get('weight', 0):.1f} кг", 
                        font=("Arial", 9), bg="white", fg="#795548").pack(side="left")
                
                # Отображаем требование уровня
                if item_data.get("level_requirement", 1) > 1:
                    level_req = item_data.get("level_requirement", 1)
                    player_level = self.player_data.get("level", 1)
                    level_color = "#4CAF50" if player_level >= level_req else "#f44336"
                    
                    tk.Label(stats_frame, text=f"📊 Уровень: {level_req}", 
                            font=("Arial", 8, "bold"), bg="white", fg=level_color).pack(side="left", padx=(0, 10))
                
                # Правая часть - кнопка экипировки
                right_frame = tk.Frame(item_card, bg="white")
                right_frame.pack(side="right")
                
                # Определяем слот для этого предмета
                if item_data.get("type") == "weapon":
                    item_slot = "weapon"
                elif item_data.get("type") == "armor":
                    item_slot = item_data.get("subtype", "body")
                else:
                    item_slot = None
                
                # Проверяем требования класса для оружия
                can_equip = True
                if item_slot == "weapon":
                    class_req = item_data.get("class_requirement")
                    if class_req and class_req != self.player_data.get("class"):
                        can_equip = False
                        equip_text = f"Требуется {class_req}"
                        equip_bg = "#9E9E9E"
                    else:
                        equip_text = "🎽 Экипировать"
                        equip_bg = "#4CAF50"
                else:
                    equip_text = "🎽 Экипировать"
                    equip_bg = "#4CAF50"
                
                if can_equip:
                    tk.Button(right_frame, text=equip_text, font=("Arial", 9, "bold"),
                            bg=equip_bg, fg="white", width=12,
                            command=lambda i=item, s=item_slot: [self.equip_item(s, i), dialog.destroy()]).pack()
                else:
                    tk.Button(right_frame, text=equip_text, font=("Arial", 9, "bold"),
                            bg=equip_bg, fg="white", width=12,
                            state="disabled").pack()
        
        # Кнопка закрытия
        tk.Button(dialog, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=dialog.destroy).pack(pady=10)
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')

    def show_equip_window_full(self):
        """Показать полное окно экипировки"""
        self.show_equip_window()

    # ================ СУНДУК ================
    def open_chest(self):
        """Открыть сундук игрока с вкладками и полной статистикой"""
        self.current_screen = "chest"
        self.clear_window()
        
        # === ЗАГОЛОВОК ===
        header_frame = tk.Frame(self.root, bg="#1976D2", height=70, relief="raised", bd=3)
        header_frame.pack(fill="x", side="top")
        
        tk.Label(header_frame, text="📦", font=("Arial", 28), 
                bg="#1976D2", fg="white").pack(side="left", padx=(15, 5), pady=10)
        
        title_frame = tk.Frame(header_frame, bg="#1976D2")
        title_frame.pack(side="left", fill="y", pady=10)
        
        tk.Label(title_frame, text="СУНДУК ХРАНИЛИЩА", font=("Arial", 16, "bold"), 
                bg="#1976D2", fg="white").pack(anchor="w")
        
        # === ДИНАМИЧЕСКАЯ МЕТКА ВЕСОВ (СУНДУК И СУМКА) ===
        chest_weight = self.calculate_chest_weight()
        full_inventory_weight = self.calculate_full_inventory_weight()
        bag_capacity = self.get_current_bag_capacity()  # <-- ДИНАМИЧЕСКАЯ
        chest_capacity = self.get_chest_capacity()      # 100.0 кг
        
        self.chest_weight_label = tk.Label(title_frame, 
            text=f"Сундук: {chest_weight:.1f}/{chest_capacity:.1f} кг | Сумка: {full_inventory_weight:.1f}/{bag_capacity:.1f} кг",
            font=("Arial", 10), bg="#1976D2", fg="#BBDEFB")
        self.chest_weight_label.pack(anchor="w")
        
        back_btn = tk.Button(header_frame, text="◀ Назад", font=("Arial", 10, "bold"),
                           bg="#0D47A1", fg="white", width=10, height=2,
                           command=self.return_to_location, relief="raised", bd=2)
        back_btn.pack(side="right", padx=15, pady=10)
        
        # === ОСНОВНОЙ КОНТЕЙНЕР ===
        main_container = tk.Frame(self.root, bg="#E3F2FD")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # === ПАНЕЛЬ ВКЛАДОК ===
        tab_frame = tk.Frame(main_container, bg="#BBDEFB", relief="groove", bd=2)
        tab_frame.pack(fill="x", pady=(0, 5))
        
        self.chest_tab_button = tk.Button(tab_frame, text="📦 Сундук", font=("Arial", 11, "bold"),
                                         bg="#1976D2", fg="white", width=15, height=1,
                                         command=lambda: self.switch_chest_tab("chest"))
        self.chest_tab_button.pack(side="left", padx=3)
        
        self.bag_tab_button = tk.Button(tab_frame, text="🎒 Сумка", font=("Arial", 11, "bold"),
                                       bg="#9E9E9E", fg="white", width=15, height=1,
                                       command=lambda: self.switch_chest_tab("bag"))
        self.bag_tab_button.pack(side="left", padx=3)
        
        # === КОНТЕЙНЕР ДЛЯ СОДЕРЖИМОГО ВКЛАДКИ ===
        self.chest_content_container = tk.Frame(main_container, bg="#E3F2FD")
        self.chest_content_container.pack(fill="both", expand=True)
        
        # === НИЖНЯЯ ПАНЕЛЬ (создаем один раз) ===
        self.bottom_info_frame = tk.Frame(self.root, bg="#BBDEFB", height=35, relief="raised", bd=1)
        self.bottom_info_frame.pack(fill="x", side="bottom", pady=(5, 0))
        
        self.bottom_info_label = tk.Label(self.bottom_info_frame, text="", font=("Arial", 9), 
                                         bg="#BBDEFB", fg="#1565C0")
        self.bottom_info_label.pack(pady=8)
        
        # Инициализируем текущую вкладку и рендерим
        self.current_chest_tab = "chest"
        self.render_chest_tab()
        
        self.create_hamburger_button()
        
        if not self.regeneration_timer:
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)


    def switch_chest_tab(self, tab_name):
        """Переключить между вкладками 'Сундук' и 'Сумка'"""
        self.current_chest_tab = tab_name
        if tab_name == "chest":
            self.chest_tab_button.config(bg="#1976D2", fg="white")
            self.bag_tab_button.config(bg="#9E9E9E", fg="white")
        else:
            self.chest_tab_button.config(bg="#9E9E9E", fg="white")
            self.bag_tab_button.config(bg="#1976D2", fg="white")
        self.render_chest_tab()


    def render_chest_tab(self):
        """Отобразить содержимое текущей вкладки с полной статистикой"""
        # Очищаем предыдущее содержимое
        for widget in self.chest_content_container.winfo_children():
            widget.destroy()
        
        items_database = self.load_items()
        
        # Объявляем переменные ДО if/else
        current_items = []
        header_title = ""
        header_bg_color = ""
        header_fg_color = ""
        action_label = ""
        on_action = None
        on_discard = None
        is_chest_view = False
        
        # Присваиваем значения в if/else
        if self.current_chest_tab == "chest":
            current_items = self.chest_items
            header_title = "📦 СОДЕРЖИМОЕ СУНДУКА"
            header_bg_color = "#BBDEFB"
            header_fg_color = "#1565C0"
            action_label = "📥 В инвентарь"
            on_action = self._take_from_chest
            on_discard = self._discard_from_chest
            is_chest_view = True
        else:  # "bag"
            current_items = self.player_data.get("inventory", [])
            header_title = "🎒 СОДЕРЖИМОЕ СУМКИ"
            header_bg_color = "#E3F2FD"
            header_fg_color = "#0D47A1"
            action_label = "📤 В сундук"
            on_action = self._put_into_chest
            on_discard = self.discard_item
            is_chest_view = False
        
        # === ЗАГОЛОВОК ВКЛАДКИ ===
        tab_header_frame = tk.Frame(self.chest_content_container, bg=header_bg_color, relief="flat", height=30)
        tab_header_frame.pack(fill="x", pady=(0, 5))
        
        tk.Label(tab_header_frame, text=header_title, font=("Arial", 12, "bold"), 
                fg=header_fg_color, bg=header_bg_color).pack(side="left", padx=10, pady=5)
        
        # Теперь переменная current_items определена и доступна
        if is_chest_view:
            # Для сундука - полный вес всех предметов в сундуке
            total_weight = self.calculate_chest_weight()
            current_capacity = self.get_chest_capacity()  # 100.0 кг
        else:
            # Для инвентаря - ПОЛНЫЙ вес (включая экипированные)
            total_weight = self.calculate_full_inventory_weight()
            current_capacity = self.get_current_bag_capacity()  # Динамическая вместимость
            
        tk.Label(tab_header_frame, text=f"{total_weight:.1f} / {current_capacity:.1f} кг", 
                font=("Arial", 10, "bold"), 
                fg="#0D47A1" if is_chest_view else "#1565C0", 
                bg=header_bg_color).pack(side="right", padx=10, pady=5)
        
        # Обновляем верхнюю метку весов в заголовке окна
        # Здесь нужно решить, что показывать в верхней панели:
        chest_weight = self.calculate_chest_weight()
        bag_weight = self.calculate_inventory_weight(self.player_data.get("inventory", []))  # Без экипированных
        full_bag_weight = self.calculate_full_inventory_weight()  # С экипированными
        
        # Показываем: Сундук (полный вес) | Сумка (полный вес)
        self.chest_weight_label.config(
            text=f"Сундук: {chest_weight:.1f}/10.0 кг | Сумка: {full_bag_weight:.1f}/10.0 кг"
        )
        

        # Обновляем нижнюю панель
        info_text = f"📦 Предметов: {len(current_items)} | ⚖️ Вес: {total_weight:.1f}/10.0 кг"
        self.bottom_info_label.config(text=info_text)
        
        # === ОТОБРАЖЕНИЕ ПУСТОГО СОСТОЯНИЯ ===
        if not current_items:
            empty_frame = tk.Frame(self.chest_content_container, bg="#E3F2FD", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            icon_text = "📭" if is_chest_view else "🎒"
            tk.Label(empty_frame, text=icon_text, font=("Arial", 40), 
                    bg="#E3F2FD", fg="#90CAF9").pack(pady=10)
            
            status_text = "Сундук пуст" if is_chest_view else "Сумка пуста"
            tk.Label(empty_frame, text=status_text, font=("Arial", 14, "bold"), 
                    bg="#E3F2FD", fg="#1565C0").pack(pady=5)
            
            description = "Положите предметы из сумки" if is_chest_view else "Добавьте предметы через поиск или найдите в мире"
            tk.Label(empty_frame, text=description, font=("Arial", 9), 
                    bg="#E3F2FD", fg="#64B5F6").pack()
            
            if is_chest_view:
                tk.Button(empty_frame, text="🔄 Перейти к сумке", font=("Arial", 10, "bold"),
                         bg="#2196F3", fg="white", width=20,
                         command=lambda: self.switch_chest_tab("bag")).pack(pady=15)
            return
        
        # === ОСНОВНОЙ КОНТЕЙНЕР С ПРОКРУТКОЙ ===
        container_frame = tk.Frame(self.chest_content_container, bg="#E3F2FD")
        container_frame.pack(fill="both", expand=True)
        
        canvas = tk.Canvas(container_frame, bg="#E3F2FD", highlightthickness=0)
        scrollbar = tk.Scrollbar(container_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#E3F2FD")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # === ОТОБРАЖЕНИЕ ПРЕДМЕТОВ В СЕТКЕ ===
        row_frame = None
        items_per_row = 2
        
        for index, item in enumerate(current_items):
            if index % items_per_row == 0:
                row_frame = tk.Frame(scrollable_frame, bg="#E3F2FD")
                row_frame.pack(fill="x", pady=5, padx=5)
            
            # === ПОЛУЧЕНИЕ ДАННЫХ ПРЕДМЕТА ===
            if isinstance(item, dict):
                item_data = item
                item_id = item_data.get("id", f"loot_{index}")
                is_loot_item = True
                base_item_id = item_data.get("base_item_id")
                base_item = items_database.get(base_item_id, {})
                base_name = base_item.get("name", "Предмет")
                prefix = item_data.get("name_prefix", "")
                display_name = f"{prefix} {base_name}".strip()
            else:
                item_id = item
                item_data = items_database.get(item_id, {
                    "name": item_id, "icon": "📦", "weight": 0.0, "type": "unknown"
                })
                is_loot_item = False
                display_name = item_data.get("name", "Предмет")
            
            # === СОЗДАНИЕ КАРТОЧКИ ПРЕДМЕТА ===
            card_frame = tk.Frame(row_frame, bg="white", relief="raised", bd=2)
            card_frame.pack(side="left", fill="both", expand=True, padx=5, ipady=5)
            
            top_part_frame = tk.Frame(card_frame, bg="white")
            top_part_frame.pack(fill="x", pady=(8, 5))
            
            tk.Label(top_part_frame, text=item_data.get("icon", "📦"), font=("Arial", 22), 
                    bg="white").pack(side="left", padx=(10, 5))
            
            info_part_frame = tk.Frame(top_part_frame, bg="white")
            info_part_frame.pack(side="left", fill="x", expand=True)
            
            # Название
            if len(display_name) > 18:
                display_name = display_name[:18] + "..."
            tk.Label(info_part_frame, text=display_name, font=("Arial", 11, "bold"), 
                    bg="white", anchor="w").pack(fill="x", padx=(0, 10))
            
            # Вес
            tk.Label(info_part_frame, text=f"⚖️ {item_data.get('weight', 0):.1f} кг", 
                    font=("Arial", 9), bg="white", fg="#1565C0", anchor="w").pack(fill="x", padx=(0, 10))
            
            # Требование уровня
            if is_loot_item and "level_requirement" in item_data and item_data["level_requirement"] > 1:
                level_requirement = item_data["level_requirement"]
                player_current_level = self.player_data.get("level", 1)
                requirement_color = "#4CAF50" if player_current_level >= level_requirement else "#f44336"
                tk.Label(info_part_frame, text=f"📊 Уровень: {level_requirement}", 
                        font=("Arial", 8, "bold"), bg="white", fg=requirement_color).pack(anchor="w", padx=(0, 10), pady=(2, 0))
            
            # Тип и характеристики
            item_type = item_data.get("type", "unknown")
            type_info_frame = tk.Frame(info_part_frame, bg="white")
            type_info_frame.pack(fill="x", padx=(0, 10), pady=(2, 0))
            
            if item_type == "weapon":
                type_color = "#D32F2F"
                type_text = "Оружие"
                subtype_text = "⚔️ Ближний" if item_data.get("subtype") == "melee" else "🏹 Дальний"
                damage_value = item_data.get("damage", 0)
                stat_text = f"Урон: {damage_value}"
                
                class_requirement = item_data.get("class_requirement")
                if class_requirement:
                    requirement_ok = (class_requirement == self.player_data.get("class"))
                    requirement_color = "#4CAF50" if requirement_ok else "#f44336"
                    tk.Label(type_info_frame, text=f"🎭 {class_requirement}", font=("Arial", 8, "bold"),
                            bg=requirement_color, fg="white", padx=3, pady=1).pack(side="left", padx=(0, 5))
                
                tk.Label(type_info_frame, text=type_text, font=("Arial", 8, "bold"),
                        bg=type_color, fg="white", padx=4, pady=1).pack(side="left")
                
                if subtype_text:
                    tk.Label(type_info_frame, text=subtype_text, font=("Arial", 8),
                            bg="white", fg=type_color, padx=4).pack(side="left", padx=(5, 0))
                
                tk.Label(info_part_frame, text=stat_text, font=("Arial", 9, "bold"),
                        bg="white", fg=type_color, anchor="w").pack(fill="x", padx=(0, 10), pady=(2, 0))
            
            elif item_type == "armor":
                type_color = "#388E3C"
                type_text = "Броня"
                subtype_map = {"head": "Голова", "body": "Тело", "hands": "Руки", "feet": "Ноги"}
                subtype_text = subtype_map.get(item_data.get("subtype"), "Броня")
                defense_value = item_data.get("defense", 0)
                stat_text = f"Защита: {defense_value}"
                
                tk.Label(type_info_frame, text=type_text, font=("Arial", 8, "bold"),
                        bg=type_color, fg="white", padx=4, pady=1).pack(side="left")
                
                if subtype_text:
                    tk.Label(type_info_frame, text=subtype_text, font=("Arial", 8),
                            bg="white", fg=type_color, padx=4).pack(side="left", padx=(5, 0))
                
                tk.Label(info_part_frame, text=stat_text, font=("Arial", 9, "bold"),
                        bg="white", fg=type_color, anchor="w").pack(fill="x", padx=(0, 10), pady=(2, 0))
            
            elif item_type == "consumable":
                type_color = "#7B1FA2"
                type_text = "Расходник"
                effect_type = item_data.get("effect", "heal")
                effect_value = item_data.get("value", 0)
                
                if effect_type == "heal":
                    effect_text = f"💚 +{effect_value} HP"
                elif effect_type == "mana":
                    effect_text = f"💙 +{effect_value} MP"
                else:
                    effect_text = f"💚💙 +{effect_value} HP/MP"
                
                subtype_text = "Зелье"
                stat_text = effect_text
                
                tk.Label(type_info_frame, text=type_text, font=("Arial", 8, "bold"),
                        bg=type_color, fg="white", padx=4, pady=1).pack(side="left")
                
                if subtype_text:
                    tk.Label(type_info_frame, text=subtype_text, font=("Arial", 8),
                            bg="white", fg=type_color, padx=4).pack(side="left", padx=(5, 0))
                
                tk.Label(info_part_frame, text=stat_text, font=("Arial", 9, "bold"),
                        bg="white", fg=type_color, anchor="w").pack(fill="x", padx=(0, 10), pady=(2, 0))
            
            else:
                type_color = "#757575"
                type_text = "Предмет"
                tk.Label(type_info_frame, text=type_text, font=("Arial", 8, "bold"),
                        bg=type_color, fg="white", padx=4, pady=1).pack(side="left")
            
            # Редкость
            if is_loot_item and "rarity" in item_data:
                rarity_frame = tk.Frame(info_part_frame, bg="white")
                rarity_frame.pack(fill="x", padx=(0, 10), pady=(2, 0))
                
                rarity_value = item_data.get("rarity", "Обычный")
                rarity_colors = {
                    "Обычный": "#757575",
                    "Необычный": "#4CAF50",
                    "Редкий": "#2196F3",
                    "Эпический": "#9C27B0",
                    "Легендарный": "#FF9800"
                }
                rarity_color = rarity_colors.get(rarity_value, "#757575")
                
                tk.Label(rarity_frame, text=f"★ {rarity_value}", font=("Arial", 8, "bold"),
                        bg=rarity_color, fg="white", padx=4, pady=1).pack(side="left")
            
            # === КНОПКИ ДЕЙСТВИЙ ===
            action_buttons_frame = tk.Frame(card_frame, bg="#E3F2FD")
            action_buttons_frame.pack(fill="x", padx=5, pady=(5, 8))
            
            # Проверка веса для перемещения
            if is_chest_view:
                # Перемещение из сундука в инвентарь
                current_inventory_weight = self.calculate_inventory_weight(self.player_data["inventory"])
                inventory_capacity = self.get_current_bag_capacity()  # <-- ДИНАМИЧЕСКАЯ
                can_move = (current_inventory_weight + item_data.get("weight", 0)) <= inventory_capacity
            else:
                # Перемещение из инвентаря в сундук
                current_chest_weight = self.calculate_chest_weight()
                chest_capacity = self.get_chest_capacity()  # 100.0 кг
                can_move = (current_chest_weight + item_data.get("weight", 0)) <= chest_capacity
            
            # Кнопка действия (взять/положить)
            tk.Button(action_buttons_frame, text=action_label, font=("Arial", 8, "bold"),
                     bg="#4CAF50" if can_move else "#757575",
                     fg="white", width=12,
                     state="normal" if can_move else "disabled",
                     command=lambda i=item: on_action(i)).pack(side="left", padx=2)
            
            # Кнопка выбросить
            tk.Button(action_buttons_frame, text="🗑 Выбросить", font=("Arial", 8, "bold"),
                     bg="#f44336", fg="white", width=12,
                     command=lambda i=item: on_discard(i)).pack(side="left", padx=2)


    # === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

    def _take_from_chest(self, item):
        """Взять предмет из сундука и поместить в инвентарь"""
        items_database = self.load_items()
        
        # Определяем вес предмета
        if isinstance(item, dict):
            item_weight = item.get("weight", 0)
            item_identifier = item.get("id")
        else:
            item_data = items_database.get(item, {})
            item_weight = item_data.get("weight", 0)
            item_identifier = item
        
        # ИСПРАВЛЕНО: используем динамическую вместимость
        current_inventory_weight = self.calculate_inventory_weight(self.player_data["inventory"])
        current_capacity = self.get_current_bag_capacity()  # <-- ДИНАМИЧЕСКАЯ ВМЕСТИМОСТЬ
        
        if current_inventory_weight + item_weight > current_capacity:
            self.show_animated_message("Инвентарь переполнен!", "#f44336", 2000)
            return
        
        # Удаляем предмет из сундука
        if isinstance(item, dict):
            # Удаляем по уникальному ID
            self.chest_items = [
                chest_item for chest_item in self.chest_items
                if not (isinstance(chest_item, dict) and chest_item.get("id") == item_identifier)
            ]
            # Добавляем объект в инвентарь
            self.player_data["inventory"].append(item)
        else:
            # Удаляем по ID
            if item in self.chest_items:
                self.chest_items.remove(item)
            self.player_data["inventory"].append(item)
        
        # Сохраняем изменения
        self.save_current_player()
        self.save_chest()
        
        # Обновляем интерфейс
        self.render_chest_tab()
        self.show_animated_message("Предмет перемещён в сумку", "#4CAF50", 1500)


    def _discard_from_chest(self, item):
        """Выбросить предмет из сундука"""
        if not messagebox.askyesno("🗑 Выбросить", "Вы уверены, что хотите выбросить этот предмет из сундука?"):
            return
        
        items_database = self.load_items()
        
        # Удаляем предмет из сундука по ID или уникальному идентификатору
        if isinstance(item, dict):
            item_identifier = item.get("id")
            self.chest_items = [
                chest_item for chest_item in self.chest_items
                if not (isinstance(chest_item, dict) and chest_item.get("id") == item_identifier)
            ]
        else:
            if item in self.chest_items:
                self.chest_items.remove(item)
        
        # Сохраняем изменения
        self.save_chest()
        
        # Обновляем интерфейс
        self.render_chest_tab()
        self.show_animated_message("Предмет выброшен из сундука", "#f44336", 1500)


    def _put_into_chest(self, item):
        """Положить предмет из инвентаря в сундук"""
        items_database = self.load_items()
        
        # Определяем вес предмета
        if isinstance(item, dict):
            item_weight = item.get("weight", 0)
            item_identifier = item.get("id")
        else:
            item_data = items_database.get(item, {})
            item_weight = item_data.get("weight", 0)
            item_identifier = item
        
        # ИСПРАВЛЕНО: используем вместимость сундука 100.0 кг
        current_chest_weight = self.calculate_chest_weight()
        chest_capacity = self.get_chest_capacity()  # 100.0 кг
        
        if current_chest_weight + item_weight > chest_capacity:
            self.show_animated_message("Сундук переполнен!", "#f44336", 2000)
            return
        
        # ... остальной код без изменений ...
        
        # Удаляем предмет из инвентаря
        if isinstance(item, dict):
            # Удаляем по уникальному ID
            self.player_data["inventory"] = [
                inventory_item for inventory_item in self.player_data["inventory"]
                if not (isinstance(inventory_item, dict) and inventory_item.get("id") == item_identifier)
            ]
            # Добавляем объект в сундук
            self.chest_items.append(item)
        else:
            # Удаляем по ID
            if item in self.player_data["inventory"]:
                self.player_data["inventory"].remove(item)
            self.chest_items.append(item)
        
        # Сохраняем изменения
        self.save_current_player()
        self.save_chest()
        
        # Обновляем интерфейс
        self.render_chest_tab()
        self.show_animated_message("Предмет перемещён в сундук", "#2196F3", 1500)


    def discard_from_chest(self, item):
        """Выбросить предмет из сундука"""
        if messagebox.askyesno("🗑 Выбросить", "Вы уверены, что хотите выбросить этот предмет из сундука?"):
            items_db = self.load_items()
            
            if isinstance(item, dict):
                # Это объект предмета из лута - ищем по id
                item_id = item.get("id")
                self.chest_items = [
                    chest_item for chest_item in self.chest_items 
                    if not (isinstance(chest_item, dict) and chest_item.get("id") == item_id)
                ]
            else:
                # Это ID предмета
                if item in self.chest_items:
                    self.chest_items.remove(item)
            
            self.save_chest()
            self.render_chest_tab()  # Исправлено: было safe_render_chest_tab()
            self.show_animated_message("Предмет выброшен из сундука", "#f44336", 1500)


    def quick_transfer(self):
        """Быстрый обмен предметами между сумкой и сундуком"""
        if not self.is_admin():
            messagebox.showinfo("Доступ запрещен", "Эта функция доступна только администратору.")
            return
            
        dialog = tk.Toplevel(self.root)
        dialog.title("⚡ Быстрый обмен")
        dialog.geometry("300x250")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        tk.Label(dialog, text="⚡ БЫСТРЫЙ ОБМЕН", font=("Arial", 12, "bold"), 
                bg="#F5F5F5", fg="#5E35B1").pack(pady=15)
        
        tk.Label(dialog, text="Выберите действие:", font=("Arial", 10), 
                bg="#F5F5F5").pack(pady=5)
        
        # ИСПРАВЛЕНО: используем динамическую вместимость
        chest_weight = self.calculate_chest_weight()
        chest_capacity = self.get_chest_capacity()  # 100.0 кг
        bag_weight = self.calculate_full_inventory_weight()
        bag_capacity = self.get_current_bag_capacity()  # ДИНАМИЧЕСКАЯ
        
        info_frame = tk.Frame(dialog, bg="#F5F5F5")
        info_frame.pack(pady=10)
        
        tk.Label(info_frame, text=f"📦 Сундук: {chest_weight:.1f}/{chest_capacity:.1f} кг", 
                font=("Arial", 9), bg="#F5F5F5").pack()
        tk.Label(info_frame, text=f"🎒 Сумка: {bag_weight:.1f}/{bag_capacity:.1f} кг", 
                font=("Arial", 9), bg="#F5F5F5").pack()
        
        def transfer_all_to_chest():
            total_weight = self.calculate_total_item_weight(self.player_data["inventory"])
            
            if chest_weight + total_weight > chest_capacity:
                messagebox.showwarning("⚠️", "Сундук не вместит все предметы!", parent=dialog)
                return
            
            
            self.chest_items.extend(self.player_data["inventory"])
            self.player_data["inventory"] = []
            self.save_current_player()
            self.save_chest()
            dialog.destroy()
            self.render_chest_tab()
            self.show_animated_message("Все предметы перемещены в сундук", "#2196F3", 2000)
        
        def transfer_all_to_bag():
            total_weight = self.calculate_total_item_weight(self.chest_items)
            
            if bag_weight + total_weight > bag_capacity:
                messagebox.showwarning("⚠️", "Сумка не вместит все предметы!", parent=dialog)
                return
            
            
            self.player_data["inventory"].extend(self.chest_items)
            self.chest_items = []
            self.save_current_player()
            self.save_chest()
            dialog.destroy()
            self.render_chest_tab()
            self.show_animated_message("Все предметы перемещены в сумку", "#4CAF50", 2000)
        
        button_frame = tk.Frame(dialog, bg="#F5F5F5")
        button_frame.pack(pady=15)
        
        tk.Button(button_frame, text="📦 Всё → Сундук", bg="#2196F3", fg="white",
                 font=("Arial", 10), width=15, command=transfer_all_to_chest).pack(pady=5)
        
        tk.Button(button_frame, text="🎒 Всё → Сумка", bg="#4CAF50", fg="white",
                 font=("Arial", 10), width=15, command=transfer_all_to_bag).pack(pady=5)
        
        tk.Button(dialog, text="❌ Отмена", bg="#757575", fg="white",
                 font=("Arial", 10), width=10, command=dialog.destroy).pack(pady=10)

    # ================ РЕДАКТОР ЛОКАЦИЙ С ЯМОЙ И ВЫБОРОМ ИГРОКА ================
    def open_locations_editor(self):
        """Открыть редактор локаций"""
        if not self.is_admin():
            return
            
        if self.editor_window and self.editor_window.winfo_exists():
            self.editor_window.lift()
            return
        
        editor = tk.Toplevel(self.root)
        self.editor_window = editor
        editor.title("🛠 Редактор локаций")
        editor.geometry("900x750")
        editor.configure(bg="#F5F5F5")
        
        # === ЗАГОЛОВОК С ПРОКРУТКОЙ ===
        header_canvas = tk.Canvas(editor, height=60, bg="#4A154B", highlightthickness=0)
        header_canvas.pack(fill="x")
        header_canvas.create_rectangle(0, 0, 900, 30, fill="#6A1B9A", outline="")
        header_canvas.create_text(450, 30, text="🛠 PocketCombats — Редактор локаций", fill="white",
                                  font=("Arial", 14, "bold"))
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(editor, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True)
        
        # Создаем Canvas для прокрутки всего редактора
        editor_canvas = tk.Canvas(main_container, bg="#F5F5F5", highlightthickness=0)
        editor_scrollbar = tk.Scrollbar(main_container, orient="vertical", command=editor_canvas.yview)
        editor_scrollable_frame = tk.Frame(editor_canvas, bg="#F5F5F5")
        
        editor_scrollable_frame.bind("<Configure>", lambda e: editor_canvas.configure(scrollregion=editor_canvas.bbox("all")))
        editor_canvas.create_window((0, 0), window=editor_scrollable_frame, anchor="nw")
        editor_canvas.configure(yscrollcommand=editor_scrollbar.set)
        
        editor_canvas.pack(side="left", fill="both", expand=True, padx=(10, 0))
        editor_scrollbar.pack(side="right", fill="y")
        
        # Заголовок с выбором локации
        header_frame = tk.Frame(editor_scrollable_frame, bg="#F5F5F5", pady=10)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text="Текущая локация:", bg="#F5F5F5").pack(side="left", padx=(20, 5))
        
        loc_var = tk.StringVar(value=self.current_location)
        loc_dropdown = ttk.Combobox(header_frame, textvariable=loc_var, 
                                   values=list(self.config["locations"].keys()),
                                   state="readonly", width=20)
        loc_dropdown.pack(side="left", padx=5)
        
        def change_location(*args):
            self.current_location = loc_var.get()
            self.open_locations_editor()
        
        loc_var.trace("w", change_location)
        
        loc = self.current_location
        cfg = self.config["locations"][loc]
        
        notebook = ttk.Notebook(editor_scrollable_frame)
        notebook.pack(fill="both", expand=True, padx=10, pady=10)
        
        # ВКЛАДКА ОСНОВНЫХ НАСТРОЕК
        settings_tab = tk.Frame(notebook, bg="#F5F5F5")
        notebook.add(settings_tab, text="Основные")
        
        tk.Label(settings_tab, text=f"Локация: {cfg.get('title', loc)}", font=("Arial", 12, "bold"), 
                bg="#F5F5F5", fg="#5E35B1").pack(pady=(10, 20))
        
        title_var = tk.StringVar(value=cfg.get("title", ""))
        title_frame = tk.Frame(settings_tab, bg="#F5F5F5")
        title_frame.pack(fill="x", padx=20, pady=5)
        tk.Label(title_frame, text="Название:", bg="#F5F5F5", width=15, anchor="w").pack(side="left")
        tk.Entry(title_frame, textvariable=title_var, width=40).pack(side="left", padx=5)
        tk.Button(title_frame, text="🔄", command=lambda: [
            cfg.update({"title": title_var.get()}),
            save_config(self.config),
            self.refresh_current_location()
        ], bg="#4CAF50", fg="white", width=3).pack(side="left", padx=5)
        
        color_frame = tk.Frame(settings_tab, bg="#F5F5F5")
        color_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(color_frame, text="Цвет фона локации:", bg="#F5F5F5", width=20, anchor="w").pack(side="left")
        bg_var = tk.StringVar(value=cfg.get("bg_color", "#FFFFFF"))
        bg_preview = tk.Label(color_frame, bg=bg_var.get(), width=4, height=1, relief="sunken")
        bg_preview.pack(side="left", padx=2)
        tk.Button(color_frame, text="🎨 Выбрать", command=lambda: self.pick_color(bg_var, bg_preview),
                  bg=bg_var.get(), fg="white" if self.is_dark_color(bg_var.get()) else "black",
                  width=10).pack(side="left", padx=2)
        
        tk.Label(color_frame, text="Цвет текста:", bg="#F5F5F5", width=15, anchor="w").pack(side="left", padx=(10, 0))
        fg_var = tk.StringVar(value=cfg.get("fg_color", "#000000"))
        fg_preview = tk.Label(color_frame, bg=fg_var.get(), width=4, height=1, relief="sunken")
        fg_preview.pack(side="left", padx=2)
        tk.Button(color_frame, text="🅰️ Выбрать", command=lambda: self.pick_color(fg_var, fg_preview),
                  bg=fg_var.get(), fg="white" if self.is_dark_color(fg_var.get()) else "black",
                  width=10).pack(side="left", padx=2)
        
        # ВКЛАДКА ЯМЫ С ЛУТОМ И ВЫБОРОМ ИГРОКА
        loot_pile_tab = tk.Frame(notebook, bg="#F5F5F5")
        notebook.add(loot_pile_tab, text="🕳️ Яма")
        
        # Контейнер для настроек ямы с прокруткой
        loot_pile_container = tk.Frame(loot_pile_tab, bg="#F5F5F5")
        loot_pile_container.pack(fill="both", expand=True)
        
        loot_pile_canvas = tk.Canvas(loot_pile_container, bg="#F5F5F5", highlightthickness=0)
        loot_pile_scrollbar = tk.Scrollbar(loot_pile_container, orient="vertical", command=loot_pile_canvas.yview)
        loot_pile_scrollable = tk.Frame(loot_pile_canvas, bg="#F5F5F5")
        
        loot_pile_scrollable.bind("<Configure>", lambda e: loot_pile_canvas.configure(scrollregion=loot_pile_canvas.bbox("all")))
        loot_pile_canvas.create_window((0, 0), window=loot_pile_scrollable, anchor="nw")
        loot_pile_canvas.configure(yscrollcommand=loot_pile_scrollbar.set)
        
        loot_pile_canvas.pack(side="left", fill="both", expand=True, padx=(10, 0))
        loot_pile_scrollbar.pack(side="right", fill="y")
        
        # Настройки ямы
        loot_pile_cfg = cfg.get("loot_pile", {})
        
        # === ВЫБОР ИГРОКА ДЛЯ ЯМЫ ===
        player_selection_frame = tk.Frame(loot_pile_scrollable, bg="#6A1B9A", relief="ridge", bd=2, padx=15, pady=15)
        player_selection_frame.pack(fill="x", padx=20, pady=(0, 10))
        
        tk.Label(player_selection_frame, text="👤 ВЫБОР ИГРОКА ДЛЯ ЯМЫ", font=("Arial", 12, "bold"), 
                bg="#6A1B9A", fg="white").pack(anchor="center", pady=(0, 10))
        
        # Получаем список всех игроков
        all_players = self.db.get_all_players()
        if not all_players:
            all_players = ["Нет игроков"]
        
        # Выбор игрока
        player_frame = tk.Frame(player_selection_frame, bg="#6A1B9A")
        player_frame.pack(fill="x", pady=5)
        
        tk.Label(player_frame, text="Игрок:", bg="#6A1B9A", fg="white", 
                font=("Arial", 11, "bold")).pack(side="left", padx=(0, 10))
        
        # Переменная для хранения выбранного игрока
        selected_player_var = tk.StringVar(value=all_players[0] if all_players else "")
        self.editor_selected_player = selected_player_var.get()  # Сохраняем выбранного игрока
        
        # Функция обновления ямы при выборе игрока
        def update_player_loot_display(*args):
            selected_player = selected_player_var.get()
            self.editor_selected_player = selected_player
            refresh_loot_pile_items()
        
        player_dropdown = ttk.Combobox(player_frame, textvariable=selected_player_var, 
                                      values=all_players, state="readonly", width=25)
        player_dropdown.pack(side="left", padx=5)
        selected_player_var.trace("w", update_player_loot_display)
        
        # Кнопка обновления списка игроков - ИСПРАВЛЕНА
        refresh_btn = tk.Button(player_frame, text="🔄 Обновить", font=("Arial", 9, "bold"),
                              bg="#2196F3", fg="white", width=10,
                              command=lambda: self.refresh_players_list_in_editor_wrapper(editor, selected_player_var))
        refresh_btn.pack(side="left", padx=5)
        
        # Информация о выбранном игроке
        info_frame = tk.Frame(player_selection_frame, bg="#8E24AA", padx=10, pady=5)
        info_frame.pack(fill="x", pady=5)
        
        self.player_info_label = tk.Label(info_frame, 
                text=f"Выбран игрок: {selected_player_var.get()}", 
                font=("Arial", 10, "bold"), bg="#8E24AA", fg="white")
        self.player_info_label.pack()
        
        # Заголовок настроек ямы
        loot_pile_header = tk.Frame(loot_pile_scrollable, bg="#8B4513", relief="ridge", bd=2, padx=15, pady=15)
        loot_pile_header.pack(fill="x", padx=20, pady=(0, 10))
        
        tk.Label(loot_pile_header, text="🕳️ НАСТРОЙКИ ЯМЫ С ЛУТОМ", font=("Arial", 12, "bold"), 
                bg="#8B4513", fg="white").pack(anchor="center", pady=(0, 10))
        
        # Видимость ямы
        visible_frame = tk.Frame(loot_pile_scrollable, bg="#F5F5F5", padx=20, pady=10)
        visible_frame.pack(fill="x")
        
        visible_var = tk.BooleanVar(value=loot_pile_cfg.get("visible", True))
        tk.Checkbutton(visible_frame, text="Показывать яму в локации", 
                      variable=visible_var, bg="#F5F5F5", font=("Arial", 11, "bold")).pack(anchor="w")
        
        # Цвета ямы
        colors_frame = tk.Frame(loot_pile_scrollable, bg="#F5F5F5", relief="ridge", bd=2, padx=15, pady=15)
        colors_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(colors_frame, text="Цвета ямы:", font=("Arial", 11, "bold"), 
                bg="#F5F5F5").pack(anchor="w", pady=(0, 10))
        
        # Цвет фона ямы
        lp_bg_var = tk.StringVar(value=loot_pile_cfg.get("bg_color", "#8B4513"))
        lp_bg_frame = tk.Frame(colors_frame, bg="#F5F5F5")
        lp_bg_frame.pack(fill="x", pady=5)
        
        tk.Label(lp_bg_frame, text="Цвет фона:", bg="#F5F5F5", width=15, anchor="w").pack(side="left")
        lp_bg_preview = tk.Label(lp_bg_frame, bg=lp_bg_var.get(), width=4, height=1, relief="sunken")
        lp_bg_preview.pack(side="left", padx=2)
        tk.Button(lp_bg_frame, text="🎨 Выбрать", 
                  command=lambda: self.pick_color(lp_bg_var, lp_bg_preview),
                  bg=lp_bg_var.get(), fg="white" if self.is_dark_color(lp_bg_var.get()) else "black",
                  width=10).pack(side="left", padx=2)
        
        # Цвет текста ямы
        lp_fg_var = tk.StringVar(value=loot_pile_cfg.get("fg_color", "#FFFFFF"))
        lp_fg_frame = tk.Frame(colors_frame, bg="#F5F5F5")
        lp_fg_frame.pack(fill="x", pady=5)
        
        tk.Label(lp_fg_frame, text="Цвет текста:", bg="#F5F5F5", width=15, anchor="w").pack(side="left")
        lp_fg_preview = tk.Label(lp_fg_frame, bg=lp_fg_var.get(), width=4, height=1, relief="sunken")
        lp_fg_preview.pack(side="left", padx=2)
        tk.Button(lp_fg_frame, text="🅰️ Выбрать", 
                  command=lambda: self.pick_color(lp_fg_var, lp_fg_preview),
                  bg=lp_fg_var.get(), fg="white" if self.is_dark_color(lp_fg_var.get()) else "black",
                  width=10).pack(side="left", padx=2)
        
        # Позиция ямы
        position_frame = tk.Frame(loot_pile_scrollable, bg="#F5F5F5", relief="ridge", bd=2, padx=15, pady=15)
        position_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(position_frame, text="Позиция и размер:", font=("Arial", 11, "bold"), 
                bg="#F5F5F5").pack(anchor="w", pady=(0, 10))
        
        # Координаты X, Y
        pos_frame = tk.Frame(position_frame, bg="#F5F5F5")
        pos_frame.pack(fill="x", pady=5)
        
        tk.Label(pos_frame, text="Позиция (X, Y):", bg="#F5F5F5", width=15, anchor="w").pack(side="left")
        lp_x_var = tk.IntVar(value=loot_pile_cfg.get("x", 20))
        lp_y_var = tk.IntVar(value=loot_pile_cfg.get("y", 350))
        tk.Spinbox(pos_frame, from_=0, to=600, textvariable=lp_x_var, width=8).pack(side="left", padx=2)
        tk.Spinbox(pos_frame, from_=0, to=450, textvariable=lp_y_var, width=8).pack(side="left", padx=2)
        
        # Размеры
        size_frame = tk.Frame(position_frame, bg="#F5F5F5")
        size_frame.pack(fill="x", pady=5)
        
        tk.Label(size_frame, text="Размеры:", bg="#F5F5F5", width=15, anchor="w").pack(side="left")
        lp_width_var = tk.IntVar(value=loot_pile_cfg.get("width", 200))
        lp_height_var = tk.IntVar(value=loot_pile_cfg.get("height", 120))
        tk.Label(size_frame, text="Ширина:", bg="#F5F5F5").pack(side="left", padx=(0, 2))
        tk.Spinbox(size_frame, from_=50, to=300, textvariable=lp_width_var, width=8).pack(side="left", padx=2)
        tk.Label(size_frame, text="Высота:", bg="#F5F5F5").pack(side="left", padx=(10, 2))
        tk.Spinbox(size_frame, from_=50, to=300, textvariable=lp_height_var, width=8).pack(side="left", padx=2)
        
        # Кнопки перемещения
        move_frame = tk.Frame(position_frame, bg="#F5F5F5")
        move_frame.pack(pady=10)
        
        def move_loot_pile(dx, dy):
            lp_x_var.set(max(0, min(600, lp_x_var.get() + dx)))
            lp_y_var.set(max(0, min(450, lp_y_var.get() + dy)))
        
        controls = tk.Frame(move_frame, bg="#F5F5F5")
        controls.pack()
        
        tk.Button(controls, text="↑", width=3, height=1, 
                 command=lambda: move_loot_pile(0, -10)).pack()
        
        dir_frame = tk.Frame(controls, bg="#F5F5F5")
        dir_frame.pack()
        
        tk.Button(dir_frame, text="←", width=3, height=1,
                 command=lambda: move_loot_pile(-10, 0)).pack(side="left")
        tk.Button(dir_frame, text="↓", width=3, height=1,
                 command=lambda: move_loot_pile(0, 10)).pack(side="left")
        tk.Button(dir_frame, text="→", width=3, height=1,
                 command=lambda: move_loot_pile(10, 0)).pack(side="left")
        
        # Текущие предметы в яме выбранного игрока
        items_frame = tk.Frame(loot_pile_scrollable, bg="#F5F5F5", relief="ridge", bd=2, padx=15, pady=15)
        items_frame.pack(fill="both", expand=True, padx=20, pady=10)
        
        tk.Label(items_frame, text=f"📦 СОДЕРЖИМОЕ ЯМЫ ИГРОКА:", font=("Arial", 11, "bold"), 
                bg="#F5F5F5", fg="#5E35B1").pack(anchor="w", pady=(0, 10))
        
        # Переменная для хранения текущих предметов
        self.current_editor_loot_items = []
        
        # Прокручиваемый список предметов
        items_container = tk.Frame(items_frame, bg="#F5F5F5", height=150)
        items_container.pack(fill="both", expand=True, pady=5)
        
        items_canvas = tk.Canvas(items_container, bg="white", highlightthickness=0)
        items_scrollbar = tk.Scrollbar(items_container, orient="vertical", command=items_canvas.yview)
        items_scrollable = tk.Frame(items_canvas, bg="white")
        
        items_scrollable.bind("<Configure>", lambda e: items_canvas.configure(scrollregion=items_canvas.bbox("all")))
        items_canvas.create_window((0, 0), window=items_scrollable, anchor="nw")
        items_canvas.configure(yscrollcommand=items_scrollbar.set)
        
        items_canvas.pack(side="left", fill="both", expand=True)
        items_scrollbar.pack(side="right", fill="y")
        
        def refresh_loot_pile_items():
            """Обновить отображение предметов в яме выбранного игрока"""
            # Обновляем информацию об игроке
            if hasattr(self, 'player_info_label'):
                selected_player = selected_player_var.get()
                self.player_info_label.config(text=f"Выбран игрок: {selected_player}")
            
            # Загружаем предметы для выбранного игрока - ИСПРАВЛЕНО
            selected_player = selected_player_var.get()
            if selected_player and selected_player != "Нет игроков":
                # Получаем яму для выбранного игрока
                self.current_editor_loot_items = self.get_player_loot_pile_for_editor(loc, selected_player)
            else:
                self.current_editor_loot_items = []
            
            # Очищаем текущее отображение
            for widget in items_scrollable.winfo_children():
                widget.destroy()
            
            if not self.current_editor_loot_items:
                tk.Label(items_scrollable, text="Яма пуста", font=("Arial", 10), 
                        bg="white", fg="#999").pack(pady=20)
            else:
                for i, item_data in enumerate(self.current_editor_loot_items):
                    item_card = tk.Frame(items_scrollable, bg="#F5F5F5", relief="groove", bd=1, padx=10, pady=10)
                    item_card.pack(fill="x", pady=2)
                    
                    # Информация о предмете
                    info_frame = tk.Frame(item_card, bg="#F5F5F5")
                    info_frame.pack(side="left", fill="both", expand=True)
                    
                    tk.Label(info_frame, text=item_data.get("icon", "📦"), font=("Arial", 16),
                            bg="#F5F5F5").pack(side="left", padx=(0, 10))
                    
                    name_frame = tk.Frame(info_frame, bg="#F5F5F5")
                    name_frame.pack(side="left", fill="both", expand=True)
                    
                    item_name = item_data.get("name", "Предмет")
                    tk.Label(name_frame, text=item_name, font=("Arial", 9, "bold"),
                            bg="#F5F5F5").pack(anchor="w")
                    
                    if item_data.get("type") == "weapon":
                        tk.Label(name_frame, text=f"⚔️ Урон: {item_data.get('damage', 0)}", 
                                font=("Arial", 8), bg="#F5F5F5", fg="#D32F2F").pack(anchor="w")
                    elif item_data.get("type") == "armor":
                        tk.Label(name_frame, text=f"🛡️ Защита: {item_data.get('defense', 0)}", 
                                font=("Arial", 8), bg="#F5F5F5", fg="#388E3C").pack(anchor="w")
                    
                    tk.Label(name_frame, text=f"⚖️ {item_data.get('weight', 0):.1f} кг", 
                            font=("Arial", 8), bg="#F5F5F5", fg="#795548").pack(anchor="w")
                    
                    # Кнопка удаления
                    tk.Button(item_card, text="🗑", font=("Arial", 8), width=3,
                             bg="#f44336", fg="white",
                             command=lambda idx=i: remove_item_from_pile(idx)).pack(side="right", padx=2)
        
        def remove_item_from_pile(index):
            """Удалить предмет из ямы игрока"""
            if 0 <= index < len(self.current_editor_loot_items):
                removed_item = self.current_editor_loot_items.pop(index)
                
                # Сохраняем изменения для выбранного игрока
                selected_player = selected_player_var.get()
                if selected_player and selected_player != "Нет игроков":
                    # Сохраняем яму для текущего игрока
                    self.save_player_loot_pile_for_editor(loc, selected_player, self.current_editor_loot_items)
                
                refresh_loot_pile_items()
                messagebox.showinfo("✅", f"Предмет удален из ямы игрока {selected_player}")
        
        # Инициализация отображения предметов
        refresh_loot_pile_items()
        
        # Кнопки управления ямой
        buttons_frame = tk.Frame(loot_pile_scrollable, bg="#F5F5F5", pady=10)
        buttons_frame.pack(fill="x", padx=20)
        
        def save_loot_pile_settings():
            """Сохранить настройки ямы"""
            # Сохраняем общие настройки ямы
            cfg["loot_pile"] = {
                "x": lp_x_var.get(),
                "y": lp_y_var.get(),
                "width": lp_width_var.get(),
                "height": lp_height_var.get(),
                "visible": visible_var.get(),
                "bg_color": lp_bg_var.get(),
                "fg_color": lp_fg_var.get()
            }
            
            # Сохраняем предметы для выбранного игрока
            selected_player = selected_player_var.get()
            if selected_player and selected_player != "Нет игроков":
                # Используем существующий метод для сохранения
                self.save_player_loot_pile_for_editor(loc, selected_player, self.current_editor_loot_items)
            
            save_config(self.config)
            messagebox.showinfo("✅", "Настройки ямы сохранены!", parent=editor)
            self.refresh_current_location()
        
        def clear_player_loot_pile():
            """Очистить яму выбранного игрока"""
            selected_player = selected_player_var.get()
            if not selected_player or selected_player == "Нет игроков":
                messagebox.showwarning("⚠️", "Сначала выберите игрока!", parent=editor)
                return
            
            if not messagebox.askyesno("🗑 Очистка ямы", 
                                      f"Вы уверены, что хотите очистить яму игрока {selected_player}?\n\n"
                                      "Все предметы в яме будут удалены безвозвратно!", parent=editor):
                return
            
            self.current_editor_loot_items.clear()
            # Используем существующий метод для сохранения
            self.save_player_loot_pile_for_editor(loc, selected_player, [])
            refresh_loot_pile_items()
            messagebox.showinfo("✅", f"Яма игрока {selected_player} очищена!", parent=editor)
        
        # ДОБАВЛЕН НОВЫЙ МЕТОД ВМЕСТО open_add_item_to_loot_dialog
        def add_item_to_loot_pile():
            """Добавить предмет в яму игрока"""
            selected_player = selected_player_var.get()
            if not selected_player or selected_player == "Нет игроков":
                messagebox.showwarning("⚠️", "Сначала выберите игрока!", parent=editor)
                return
            
            # Создаем диалог добавления предмета
            self.add_item_to_loot_pile_dialog(editor, loc, selected_player, refresh_loot_pile_items)
        
        # Кнопки управления
        btn_container = tk.Frame(buttons_frame, bg="#F5F5F5")
        btn_container.pack(fill="x", pady=5)
        
        tk.Button(btn_container, text="💾 Сохранить настройки", bg="#4CAF50", fg="white",
                 font=("Arial", 10, "bold"), width=20,
                 command=save_loot_pile_settings).pack(side="left", padx=2)
        
        tk.Button(btn_container, text="➕ Добавить предмет", bg="#2196F3", fg="white",
                 font=("Arial", 10, "bold"), width=20,
                 command=add_item_to_loot_pile).pack(side="left", padx=2)
        
        tk.Button(btn_container, text="🗑 Очистить яму", bg="#f44336", fg="white",
                 font=("Arial", 10, "bold"), width=20,
                 command=clear_player_loot_pile).pack(side="left", padx=2)
        
        # ВКЛАДКА КНОПОК
        buttons_tab = tk.Frame(notebook, bg="#F5F5F5")
        notebook.add(buttons_tab, text="Кнопки")
        
        buttons_container = tk.Frame(buttons_tab, bg="#F5F5F5")
        buttons_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        buttons_canvas = tk.Canvas(buttons_container, bg="white", relief="solid", bd=1)
        buttons_scrollbar = tk.Scrollbar(buttons_container, orient="vertical", command=buttons_canvas.yview)
        buttons_scrollable = tk.Frame(buttons_canvas, bg="white")
        
        buttons_scrollable.bind("<Configure>", lambda e: buttons_canvas.configure(scrollregion=buttons_canvas.bbox("all")))
        buttons_canvas.create_window((0, 0), window=buttons_scrollable, anchor="nw")
        buttons_canvas.configure(yscrollcommand=buttons_scrollbar.set)
        
        buttons_canvas.pack(side="left", fill="both", expand=True)
        buttons_scrollbar.pack(side="right", fill="y")
        
        buttons = {}
        for btn_id, btn_cfg in cfg.items():
            if isinstance(btn_cfg, dict) and btn_id not in ("title", "monster", "monster_bg_color", "monster_fg_color", "loot_pile"):
                self.create_editor_card(buttons_scrollable, loc, btn_id, btn_cfg, editor)
                buttons[btn_id] = btn_cfg
        
        if not buttons:
            tk.Label(buttons_scrollable, text="Нет кнопок в этой локации", font=("Arial", 12), 
                    bg="white", fg="#999").pack(pady=50)
        
        # ВКЛАДКА МОНСТРОВ С ПРОКРУТКОЙ
        monsters_tab = tk.Frame(notebook, bg="#F5F5F5")
        notebook.add(monsters_tab, text="👹 Монстры")
        
        # Контейнер для монстров с прокруткой
        monsters_container = tk.Frame(monsters_tab, bg="#F5F5F5")
        monsters_container.pack(fill="both", expand=True)
        
        monsters_canvas = tk.Canvas(monsters_container, bg="#F5F5F5", highlightthickness=0)
        monsters_scrollbar = tk.Scrollbar(monsters_container, orient="vertical", command=monsters_canvas.yview)
        monsters_scrollable = tk.Frame(monsters_canvas, bg="#F5F5F5")
        
        monsters_scrollable.bind("<Configure>", lambda e: monsters_canvas.configure(scrollregion=monsters_canvas.bbox("all")))
        monsters_canvas.create_window((0, 0), window=monsters_scrollable, anchor="nw")
        monsters_canvas.configure(yscrollcommand=monsters_scrollbar.set)
        
        monsters_canvas.pack(side="left", fill="both", expand=True, padx=(10, 0))
        monsters_scrollbar.pack(side="right", fill="y")
        
        # Заголовок вкладки
        header_frame = tk.Frame(monsters_scrollable, bg="#9C27B0", height=40)
        header_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(header_frame, text="👹 УПРАВЛЕНИЕ МОНСТРАМИ В ЛОКАЦИИ", 
                font=("Arial", 12, "bold"), bg="#9C27B0", fg="white").pack(pady=10)
        
        # Получаем массив монстров
        monsters_data = cfg.get("monsters", [])
        monsters_count = len(monsters_data)
        
        # Информация о количестве монстров
        info_frame = tk.Frame(monsters_scrollable, bg="#E1BEE7", padx=10, pady=5)
        info_frame.pack(fill="x", padx=10, pady=(0, 10))
        
        tk.Label(info_frame, text=f"Всего монстров: {monsters_count}/5", 
                font=("Arial", 10, "bold"), bg="#E1BEE7", fg="#7B1FA2").pack(side="left")
        
        # Кнопка открытия полноценного редактора монстров
        editor_btn = tk.Button(info_frame, text="🛠 Открыть редактор монстров", 
                      font=("Arial", 9, "bold"), bg="#7B1FA2", fg="white",
                      command=lambda loc=self.current_location: self.open_monsters_editor(loc))
        editor_btn.pack(side="right")
        
        
        # Отображение существующих монстров
        if not monsters_data:
            empty_frame = tk.Frame(monsters_scrollable, bg="#F5F5F5", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="👻", font=("Arial", 40), 
                    bg="#F5F5F5", fg="#E1BEE7").pack(pady=10)
            tk.Label(empty_frame, text="Нет монстров в этой локации", 
                    font=("Arial", 12, "bold"), bg="#F5F5F5", fg="#9C27B0").pack(pady=5)
            tk.Label(empty_frame, text="Используйте редактор монстров для их добавления", 
                    font=("Arial", 9), bg="#F5F5F5", fg="#BA68C8").pack()
        else:
            for i, monster_data in enumerate(monsters_data):
                monster = Monster.from_dict(monster_data)
                if not monster:
                    continue
                
                # Карточка монстра для быстрого просмотра
                monster_card = tk.Frame(monsters_scrollable, bg="white", relief="ridge", bd=2, padx=10, pady=10)
                monster_card.pack(fill="x", pady=5, padx=10)
                
                # Верхняя часть карточки
                top_frame = tk.Frame(monster_card, bg="white")
                top_frame.pack(fill="x", pady=(0, 5))
                
                tk.Label(top_frame, text=monster.icon, font=("Arial", 20), 
                        bg="white").pack(side="left", padx=(0, 10))
                
                info_frame = tk.Frame(top_frame, bg="white")
                info_frame.pack(side="left", fill="both", expand=True)
                
                tk.Label(info_frame, text=f"#{i+1}: {monster.name}", font=("Arial", 11, "bold"), 
                        bg="white", fg="#9C27B0").pack(anchor="w")
                
                # Статус
                status_text = "🟢 Жив" if monster.is_alive else "🔴 Мертв"
                status_color = "#4CAF50" if monster.is_alive else "#f44336"
                tk.Label(info_frame, text=status_text, font=("Arial", 9),
                        bg=status_color, fg="white", padx=3, pady=1).pack(anchor="w", pady=(2, 0))
                
                # Характеристики
                stats_frame = tk.Frame(monster_card, bg="#F3E5F5")
                stats_frame.pack(fill="x", pady=5)
                
                row1 = tk.Frame(stats_frame, bg="#F3E5F5")
                row1.pack(fill="x")
                
                tk.Label(row1, text=f"❤️ HP: {monster.hp}/{monster.hp_max}", 
                        font=("Arial", 9), bg="#F3E5F5", fg="#D32F2F").pack(side="left", padx=5)
                tk.Label(row1, text=f"⚔️ Урон: {monster.min_dmg}-{monster.max_dmg}", 
                        font=("Arial", 9), bg="#F3E5F5", fg="#FF9800").pack(side="left", padx=5)
                tk.Label(row1, text=f"⭐ Опыт: {monster.exp_reward}", 
                        font=("Arial", 9), bg="#F3E5F5", fg="#FFD700").pack(side="left", padx=5)
                
                # Позиция
                pos_frame = tk.Frame(stats_frame, bg="#F3E5F5")
                pos_frame.pack(fill="x", pady=2)
                
                tk.Label(pos_frame, text=f"📍 Позиция: ({monster.x}, {monster.y})", 
                        font=("Arial", 8), bg="#F3E5F5", fg="#795548").pack(anchor="w")
                
                # Кнопки быстрого управления
                btn_frame = tk.Frame(monster_card, bg="white")
                btn_frame.pack(fill="x", pady=(5, 0))
                
                tk.Button(btn_frame, text="⚡ Воскресить", font=("Arial", 8),
                        bg="#2196F3", fg="white", width=12,
                        command=lambda idx=i, loc=self.current_location: self.quick_respawn_monster_in_editor(idx, loc, editor)).pack(side="left", padx=2)
                
                tk.Button(btn_frame, text="🗑 Удалить", font=("Arial", 8),
                        bg="#f44336", fg="white", width=12,
                        command=lambda idx=i, loc=self.current_location: self.quick_delete_monster_in_editor(idx, loc, editor)).pack(side="left", padx=2)
        
        add_frame = tk.Frame(monsters_scrollable, bg="#F5F5F5", pady=15)
        add_frame.pack(fill="x", side="bottom", padx=10)

        if len(monsters_data) < 5:
            tk.Button(add_frame, text="➕ Быстро добавить монстра (Волк)", 
                font=("Arial", 10, "bold"), bg="#7B1FA2", fg="white", width=30,
                command=lambda loc=self.current_location: self.quick_add_monster_in_editor(loc, editor)).pack()
        else:
            tk.Label(add_frame, text="⚠️ Достигнут лимит монстров (5)", 
                font=("Arial", 9, "bold"), bg="#F5F5F5", fg="#f44336").pack()
            
        btn_frame = tk.Frame(editor_scrollable_frame, bg="#F5F5F5")
        btn_frame.pack(side="bottom", fill="x", pady=10)

        # Создаем кнопки управления
        tk.Button(btn_frame, text="➕ Добавить кнопку", 
                command=lambda ed=editor, lc=self.current_location: self.add_button_dialog(ed, lc),
                bg="#2196F3", fg="white").pack(side="left", padx=5)

        tk.Button(btn_frame, text="➕ Добавить локацию", bg="#9C27B0", fg="white",
                command=lambda ed=editor: self.add_new_location(ed)).pack(side="left", padx=5)

        tk.Button(btn_frame, text="🗑 Удалить локацию", bg="#f44336", fg="white",
                command=lambda ed=editor: self.delete_current_location(ed)).pack(side="left", padx=5)

        tk.Button(btn_frame, text="💾 Сохранить всё", bg="#4CAF50", fg="white",
                command=lambda: [save_config(self.config), 
                                messagebox.showinfo("✅", "Сохранено!", parent=editor)]).pack(side="left", padx=5)

        tk.Button(btn_frame, text="🔄 Обновить", bg="#FF9800", fg="white", 
                command=lambda: [self.refresh_current_location(),
                                messagebox.showinfo("🔄", "Локация обновлена!", parent=editor)]).pack(side="left", padx=5)
        
        # ============ ОБРАБОТЧИК ЗАКРЫТИЯ ОКНА ============
        def on_editor_close():
            editor.destroy()
            self.editor_window = None
        
        editor.protocol("WM_DELETE_WINDOW", on_editor_close)
        
        # Центрируем окно
        editor.update_idletasks()
        width = editor.winfo_width()
        height = editor.winfo_height()
        x = (editor.winfo_screenwidth() // 2) - (width // 2)
        y = (editor.winfo_screenheight() // 2) - (height // 2)
        editor.geometry(f'{width}x{height}+{x}+{y}')

    def quick_respawn_monster_in_editor(self, monster_index, location, editor_window):
        """Быстрое воскрешение монстра в редакторе"""
        # Используем переданную location
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        monster.is_alive = True
        monster.hp = monster.hp_max
        monster.respawn_time = None
        
        monsters_data[monster_index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][location] = loc_cfg
        save_config(self.config)
        
        # Обновляем редактор
        editor_window.destroy()
        self.open_locations_editor()
        
        self.show_animated_message(f"Монстр '{monster.name}' воскрешен!", "#4CAF50")
    
    def quick_delete_monster_in_editor(self, monster_index, location, editor_window):
        """Быстрое удаление монстра в редакторе"""
        # Используем переданную location
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        response = messagebox.askyesno("🗑 Удаление", f"Удалить монстра '{monster.name}'?")
        
        if response:
            monsters_data.pop(monster_index)
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            
            # Обновляем редактор
            editor_window.destroy()
            self.open_locations_editor()
            
            self.show_animated_message(f"Монстр '{monster.name}' удален!", "#FF9800")
    
    def quick_add_monster_in_editor(self, location, editor_window):
        """Быстрое добавление монстра в редакторе"""
        # Используем переданную location
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if len(monsters_data) >= 5:
            messagebox.showwarning("⚠️", "В локации может быть не более 5 монстров!")
            return
        
        # Автоматически рассчитываем позицию
        base_x = 400
        base_y = 120
        spacing_x = 120
        
        new_index = len(monsters_data)
        row = new_index // 2
        col = new_index % 2
        
        x = base_x + (col * spacing_x)
        y = base_y + (row * 100)
        
        # Создаем нового монстра (Волк по умолчанию)
        new_monster = Monster(
            name="Волк",
            hp=10,
            hp_max=10,
            min_dmg=2,
            max_dmg=4,
            icon="🐺",
            x=x,
            y=y,
            respawn_time=15
        )
        new_monster.exp_reward = 20
        
        # Добавляем в массив
        monsters_data.append(new_monster.to_dict())
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][location] = loc_cfg
        save_config(self.config)
        
        # Обновляем редактор
        editor_window.destroy()
        self.open_locations_editor()
        self.show_animated_message(f"Монстр 'Волк' добавлен!", "#4CAF50")
        


    # ================ НОВЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ЯМОЙ В РЕДАКТОРЕ ================
    
    def get_player_loot_pile_for_editor(self, location, username):
        """Получить яму с лутом для указанного игрока в редакторе"""
        if not username:
            return []
        
        # Загружаем конфигурацию локации
        loc_cfg = self.config["locations"].get(location, {})
        loot_pile_cfg = loc_cfg.get("loot_pile", {})
        
        # Получаем player_loot_piles из конфигурации
        player_loot_piles = loot_pile_cfg.get("player_loot_piles", {})
        
        # Создаем ключ для игрока
        loot_key = f"loot_pile_{username}_{location}"
        
        # Возвращаем предметы игрока или пустой список
        return player_loot_piles.get(loot_key, [])

    def save_player_loot_pile_for_editor(self, location, username, items):
        """Сохранить яму с лутом для указанного игрока в редакторе"""
        if not username:
            return
        
        # Загружаем конфигурацию локации
        loc_cfg = self.config["locations"].get(location, {})
        loot_pile_cfg = loc_cfg.get("loot_pile", {})
        
        # Инициализируем словарь ям игроков, если его нет
        if "player_loot_piles" not in loot_pile_cfg:
            loot_pile_cfg["player_loot_piles"] = {}
        
        # Создаем ключ для игрока
        loot_key = f"loot_pile_{username}_{location}"
        
        # Сохраняем предметы для игрока
        loot_pile_cfg["player_loot_piles"][loot_key] = items
        
        # Обновляем конфигурацию и сохраняем
        loc_cfg["loot_pile"] = loot_pile_cfg
        self.config["locations"][location] = loc_cfg
        save_config(self.config)

    def add_item_to_loot_pile_dialog(self, editor, location, username, refresh_callback):
        """Диалог добавления предмета в яму игрока"""
        dialog = tk.Toplevel(editor)
        dialog.title(f"➕ Добавить предмет в яму: {username}")
        dialog.geometry("600x500")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(editor)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#5E35B1", height=50)
        header_frame.pack(fill="x")
        tk.Label(header_frame, text=f"➕ ДОБАВЛЕНИЕ ПРЕДМЕТА В ЯМУ: {username}", 
                 font=("Arial", 12, "bold"), bg="#5E35B1", fg="white").pack(pady=10)
        
        # Поисковая строка
        search_frame = tk.Frame(dialog, bg="#F5F5F5", padx=10, pady=10)
        search_frame.pack(fill="x")
        
        tk.Label(search_frame, text="Поиск:", bg="#F5F5F5").pack(side="left", padx=(0, 5))
        search_var = tk.StringVar()
        search_entry = tk.Entry(search_frame, textvariable=search_var, width=40)
        search_entry.pack(side="left", padx=5)
        search_entry.focus()
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=5)
        
        canvas = tk.Canvas(main_container, bg="#F5F5F5", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#F5F5F5")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        items_db = self.load_items()
        all_items = list(items_db.keys())
        
        def filter_items():
            """Фильтрация и отображение предметов"""
            for widget in scrollable_frame.winfo_children():
                widget.destroy()
            
            search_text = search_var.get().lower()
            
            filtered_items = []
            for item_id in all_items:
                item = items_db.get(item_id, {})
                matches_search = (search_text in item_id.lower() or 
                                 search_text in item.get("name", "").lower())
                
                if matches_search:
                    filtered_items.append((item_id, item))
            
            if not filtered_items:
                tk.Label(scrollable_frame, text="❌ Предметы не найдены", 
                        font=("Arial", 12), bg="#F5F5F5", fg="#757575").pack(pady=50)
                return
            
            for item_id, item in filtered_items:
                # Карточка предмета
                card = tk.Frame(scrollable_frame, bg="white", relief="raised", bd=1, padx=10, pady=10)
                card.pack(fill="x", pady=5)
                
                # Левая часть - информация
                left_frame = tk.Frame(card, bg="white")
                left_frame.pack(side="left", fill="both", expand=True)
                
                # Иконка и название
                top_frame = tk.Frame(left_frame, bg="white")
                top_frame.pack(fill="x")
                
                tk.Label(top_frame, text=item.get("icon", "📦"), font=("Arial", 20), 
                        bg="white").pack(side="left", padx=(0, 10))
                
                name_frame = tk.Frame(top_frame, bg="white")
                name_frame.pack(side="left", fill="both", expand=True)
                
                tk.Label(name_frame, text=item["name"], font=("Arial", 11, "bold"), 
                        bg="white").pack(anchor="w")
                tk.Label(name_frame, text=f"ID: {item_id}", font=("Arial", 9), 
                        bg="white", fg="#757575").pack(anchor="w")
                
                # Статистики
                stats_frame = tk.Frame(left_frame, bg="white")
                stats_frame.pack(fill="x", pady=(5, 0))
                
                if item.get("type") == "weapon":
                    tk.Label(stats_frame, text=f"⚔️ Урон: {item.get('damage', 0)}", 
                            font=("Arial", 9), bg="white", fg="#D32F2F").pack(side="left", padx=(0, 10))
                elif item.get("type") == "armor":
                    tk.Label(stats_frame, text=f"🛡️ Защита: {item.get('defense', 0)}", 
                            font=("Arial", 9), bg="white", fg="#388E3C").pack(side="left", padx=(0, 10))
                
                tk.Label(stats_frame, text=f"⚖️ {item.get('weight', 0):.1f} кг", 
                        font=("Arial", 9), bg="white", fg="#795548").pack(side="left")
                
                # Правая часть - кнопка добавления
                btn_frame = tk.Frame(card, bg="white")
                btn_frame.pack(side="right")
                
                tk.Button(btn_frame, text="➕ Добавить", font=("Arial", 9, "bold"),
                         bg="#4CAF50", fg="white", width=12,
                         command=lambda iid=item_id: self.add_item_to_player_loot_pile(
                             username, location, iid, dialog, refresh_callback)).pack(pady=2)
        
        # Привязываем события поиска
        search_var.trace("w", lambda *args: filter_items())
        
        # Инициализация списка
        filter_items()
        
        # Кнопка закрытия
        tk.Button(dialog, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=dialog.destroy).pack(pady=10)

    def add_item_to_player_loot_pile(self, username, location, item_id, dialog, refresh_callback):
        """Добавить конкретный предмет в яму игрока"""
        items_db = self.load_items()
        item = items_db.get(item_id, {})
        
        if not item:
            messagebox.showerror("Ошибка", f"Предмет {item_id} не найден!", parent=dialog)
            return
        
        # Создаем уникальный ID для предмета лута
        timestamp = int(time.time() * 1000)
        random_suffix = random.randint(1000, 9999)
        generated_id = f"{item_id}_loot_{timestamp}_{random_suffix}"
        
        # Создаем объект предмета лута
        loot_item = {
            "id": generated_id,
            "base_item_id": item_id,
            "name": item.get("name", "Предмет"),
            "type": item.get("type", "unknown"),
            "subtype": item.get("subtype", ""),
            "icon": item.get("icon", "📦"),
            "weight": item.get("weight", 0),
            "class_requirement": item.get("class_requirement", ""),
            "rarity": "Обычный"
        }
        
        # Добавляем характеристики в зависимости от типа
        if item.get("type") == "weapon":
            loot_item["damage"] = item.get("damage", 0)
        elif item.get("type") == "armor":
            loot_item["defense"] = item.get("defense", 0)
        elif item.get("type") == "consumable":
            loot_item["effect"] = item.get("effect", "heal")
            loot_item["value"] = item.get("value", 0)
        
        # Получаем текущие предметы игрока
        current_items = self.get_player_loot_pile_for_editor(location, username)
        
        # Проверяем лимит предметов в яме
        if len(current_items) >= 10:
            messagebox.showwarning("⚠️", "Яма игрока заполнена (максимум 10 предметов)!", parent=dialog)
            return
        
        # Добавляем предмет
        current_items.append(loot_item)
        
        # Сохраняем
        self.save_player_loot_pile_for_editor(location, username, current_items)
        
        messagebox.showinfo("✅", f"Предмет '{item.get('name', item_id)}' добавлен в яму игрока {username}!", parent=dialog)
        dialog.destroy()
        
        # Обновляем отображение
        if refresh_callback:
            refresh_callback()

    def refresh_players_list_in_editor_wrapper(self, editor, selected_player_var):
        """Обертка для обновления списка игроков в редакторе"""
        # Обновляем список игроков в базе
        all_players = self.db.get_all_players()
        if not all_players:
            all_players = ["Нет игроков"]
        
        # Обновляем выпадающий список
        selected_player_var.set(all_players[0] if all_players else "")
        player_dropdown = None
        
        # Ищем комбобокс в окне
        for widget in editor.winfo_children():
            if isinstance(widget, tk.Toplevel):
                for child in widget.winfo_children():
                    if isinstance(child, tk.Frame):
                        for grandchild in child.winfo_children():
                            if isinstance(grandchild, tk.Frame):
                                for greatgrandchild in grandchild.winfo_children():
                                    if isinstance(greatgrandchild, ttk.Combobox):
                                        player_dropdown = greatgrandchild
                                        break
        
        if player_dropdown:
            player_dropdown['values'] = all_players
            if all_players:
                selected_player_var.set(all_players[0])
        
        # Обновляем отображение ямы для нового игрока
        if hasattr(self, 'current_editor_loot_items'):
            # Сбрасываем текущие предметы
            self.current_editor_loot_items = []
            
            # Находим и вызываем функцию обновления отображения
            if hasattr(self, 'refresh_loot_pile_items'):
                # Ищем функцию в локальной области видимости
                for var_name, var_value in locals().items():
                    if callable(var_value) and var_name == 'refresh_loot_pile_items':
                        var_value()
                        break
        
        # Показываем сообщение
        messagebox.showinfo("🔄 Обновлено", f"Список игроков обновлен: {len(all_players)} игроков")

    def refresh_players_list_in_editor_wrapper(self, editor, selected_player_var):
        """Обертка для обновления списка игроков в редакторе"""
        # Обновляем список игроков в базе
        all_players = self.db.get_all_players()
        
        # Обновляем выпадающий список
        for widget in editor.winfo_children():
            if isinstance(widget, tk.Toplevel):
                # Ищем все комбобоксы в окне
                self._update_combobox_values(widget, all_players, selected_player_var)
        
        # Показываем сообщение
        messagebox.showinfo("🔄 Обновлено", f"Список игроков обновлен: {len(all_players)} игроков")

    def _update_combobox_values(self, parent, values, selected_var):
        """Рекурсивно обновить значения комбобоксов"""
        for widget in parent.winfo_children():
            if isinstance(widget, ttk.Combobox):
                widget['values'] = values
                if values and selected_var.get() not in values:
                    selected_var.set(values[0])
            elif isinstance(widget, tk.Frame) or isinstance(widget, tk.Toplevel):
                self._update_combobox_values(widget, values, selected_var)

    def create_loot_item_card(self, parent, loot_item, index):
        """Создать карточку предмета лута для отображения в редакторе"""
        items_db = self.load_static_items()
        base_item = items_db.get(loot_item.base_item_id, {})
        
        card = tk.Frame(parent, bg="#F5F5F5", relief="groove", bd=1, padx=10, pady=10)
        card.pack(fill="x", pady=2)
        
        # Сохраняем индекс для обновления
        card.item_index = index
        card.loot_item = loot_item
        
        # Верхняя часть с информацией
        top_frame = tk.Frame(card, bg="#F5F5F5")
        top_frame.pack(fill="x")
        
        # Иконка и название
        tk.Label(top_frame, text=base_item.get("icon", "📦"), font=("Arial", 16),
                bg="#F5F5F5").pack(side="left", padx=(0, 10))
        
        info_frame = tk.Frame(top_frame, bg="#F5F5F5")
        info_frame.pack(side="left", fill="both", expand=True)
        
        # Название предмета
        item_name = f"{loot_item.name_prefix} {base_item.get('name', 'Предмет')}".strip()
        tk.Label(info_frame, text=item_name, font=("Arial", 9, "bold"),
                bg="#F5F5F5").pack(anchor="w")
        
        # Редкость
        rarity_colors = {
            "Обычный": "#757575",
            "Необычный": "#4CAF50",
            "Редкий": "#2196F3",
            "Эпический": "#9C27B1",
            "Легендарный": "#FF9800"
        }
        rarity_color = rarity_colors.get(loot_item.rarity, "#757575")
        
        rarity_frame = tk.Frame(info_frame, bg="#F5F5F5")
        rarity_frame.pack(anchor="w", pady=2)
        
        tk.Label(rarity_frame, text=f"★ {loot_item.rarity}", font=("Arial", 8, "bold"),
                bg=rarity_color, fg="white", padx=3, pady=1).pack(side="left", padx=(0, 5))
        
        # Шанс выпадения
        tk.Label(rarity_frame, text=f"Шанс: {loot_item.drop_chance}%", 
                font=("Arial", 8), bg="#F5F5F5", fg="#795548").pack(side="left", padx=(0, 5))
        
        # Диапазоны характеристик
        stats_frame = tk.Frame(info_frame, bg="#F5F5F5")
        stats_frame.pack(anchor="w", pady=2)
        
        if base_item.get("type") == "weapon":
            tk.Label(stats_frame, text=f"⚔️ Урон: {loot_item.damage_range[0]}-{loot_item.damage_range[1]}", 
                    font=("Arial", 8), bg="#F5F5F5", fg="#D32F2F").pack(side="left", padx=(0, 5))
        elif base_item.get("type") == "armor":
            tk.Label(stats_frame, text=f"🛡️ Защита: {loot_item.defense_range[0]}-{loot_item.defense_range[1]}", 
                    font=("Arial", 8), bg="#F5F5F5", fg="#388E3C").pack(side="left", padx=(0, 5))
        
        tk.Label(stats_frame, text=f"⚖️ Вес: {loot_item.weight_range[0]:.1f}-{loot_item.weight_range[1]:.1f}", 
                font=("Arial", 8), bg="#F5F5F5", fg="#795548").pack(side="left")
        
        # Кнопки управления
        btn_frame = tk.Frame(card, bg="#F5F5F5")
        btn_frame.pack(fill="x", pady=(5, 0))
        
        # Кнопка редактирования
        edit_btn = tk.Button(btn_frame, text="✏️ Изменить", font=("Arial", 8, "bold"),
                           bg="#2196F3", fg="white", width=10,
                           command=lambda idx=index, item=loot_item: self.edit_loot_item_dialog(idx, item))
        edit_btn.pack(side="left", padx=2)
        
        # Кнопка удаления - ИСПРАВЛЕНА
        delete_btn = tk.Button(btn_frame, text="🗑 Удалить", font=("Arial", 8, "bold"),
                             bg="#f44336", fg="white", width=10,
                             command=lambda idx=index: self.remove_loot_item_from_monster(idx))
        delete_btn.pack(side="right", padx=2)
    
    def remove_loot_item_from_monster(self, index):
        """Удалить предмет из таблицы лута монстра (ИСПРАВЛЕННАЯ ВЕРСИЯ)"""
        if 0 <= index < len(self.current_monster_loot_items):
            # Удаляем предмет по индексу
            removed_item = self.current_monster_loot_items.pop(index)
            
            # Показываем сообщение
            items_db = self.load_static_items()
            base_item = items_db.get(removed_item.base_item_id, {})
            item_name = f"{removed_item.name_prefix} {base_item.get('name', 'Предмет')}".strip()
            
            messagebox.showinfo("✅", f"Предмет лута удален: {item_name}")
            
            # Обновляем отображение
            if hasattr(self, 'refresh_loot_display'):
                self.refresh_loot_display()
    
    def edit_loot_item_dialog(self, index, loot_item):
        """Диалог редактирования предмета лута"""
        dialog = tk.Toplevel(self.root)
        dialog.title("✏️ Редактирование предмета лута")
        dialog.geometry("500x450")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Сохраняем индекс для обновления
        dialog.item_index = index
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#5E35B1", height=50)
        header_frame.pack(fill="x")
        tk.Label(header_frame, text="✏️ РЕДАКТИРОВАНИЕ ПРЕДМЕТА ЛУТА", 
                 font=("Arial", 12, "bold"), bg="#5E35B1", fg="white").pack(pady=10)
        
        # Основной контейнер
        main_container = tk.Frame(dialog, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        items_db = self.load_static_items()
        base_item = items_db.get(loot_item.base_item_id, {})
        
        # Информация о базовом предмете
        info_frame = tk.Frame(main_container, bg="#E3F2FD", relief="ridge", bd=2, padx=10, pady=10)
        info_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(info_frame, text=f"Базовый предмет: {base_item.get('name', 'Предмет')}", 
                 font=("Arial", 11, "bold"), bg="#E3F2FD", fg="#1565C0").pack(anchor="w")
        tk.Label(info_frame, text=f"Тип: {base_item.get('type', 'unknown')}", 
                 font=("Arial", 9), bg="#E3F2FD", fg="#0D47A1").pack(anchor="w")
        
        # Поля для редактирования
        edit_frame = tk.Frame(main_container, bg="#F5F5F5", relief="ridge", bd=2, padx=15, pady=15)
        edit_frame.pack(fill="x", pady=5)
        
        tk.Label(edit_frame, text="Настройки предмета:", font=("Arial", 11, "bold"), 
                 bg="#F5F5F5").pack(anchor="w", pady=(0, 10))
        
        # Префикс названия
        prefix_frame = tk.Frame(edit_frame, bg="#F5F5F5")
        prefix_frame.pack(fill="x", pady=5)
        
        tk.Label(prefix_frame, text="Префикс названия:", bg="#F5F5F5", 
                 width=20, anchor="w").pack(side="left")
        prefix_var = tk.StringVar(value=loot_item.name_prefix)
        tk.Entry(prefix_frame, textvariable=prefix_var, width=20).pack(side="left")
        
        # Редкость
        rarity_frame = tk.Frame(edit_frame, bg="#F5F5F5")
        rarity_frame.pack(fill="x", pady=5)
        
        tk.Label(rarity_frame, text="Редкость:", bg="#F5F5F5", 
                 width=20, anchor="w").pack(side="left")
        
        rarity_var = tk.StringVar(value=loot_item.rarity)
        rarity_options = ["Обычный", "Необычный", "Редкий", "Эпический", "Легендарный"]
        
        rarity_combo = ttk.Combobox(rarity_frame, textvariable=rarity_var, 
                                   values=rarity_options, state="readonly", width=18)
        rarity_combo.pack(side="left")
        
        # Шанс выпадения
        chance_frame = tk.Frame(edit_frame, bg="#F5F5F5")
        chance_frame.pack(fill="x", pady=5)
        
        tk.Label(chance_frame, text="Шанс выпадения (%):", bg="#F5F5F5", 
                 width=20, anchor="w").pack(side="left")
        
        chance_var = tk.IntVar(value=loot_item.drop_chance)
        tk.Spinbox(chance_frame, from_=1, to=100, textvariable=chance_var, 
                  width=10).pack(side="left")
        
        # Диапазоны характеристик
        ranges_frame = tk.Frame(edit_frame, bg="#F5F5F5", pady=10)
        ranges_frame.pack(fill="x")
        
        tk.Label(ranges_frame, text="Диапазоны характеристик:", font=("Arial", 10, "bold"), 
                 bg="#F5F5F5").pack(anchor="w", pady=(0, 5))
        
        # В зависимости от типа предмета показываем разные поля
        if base_item.get("type") == "weapon":
            # Диапазон урона
            dmg_frame = tk.Frame(ranges_frame, bg="#F5F5F5")
            dmg_frame.pack(fill="x", pady=3)
            
            tk.Label(dmg_frame, text="Диапазон урона:", bg="#F5F5F5",
                    width=20, anchor="w").pack(side="left")
            
            min_dmg_var = tk.IntVar(value=loot_item.damage_range[0])
            max_dmg_var = tk.IntVar(value=loot_item.damage_range[1])
            
            tk.Spinbox(dmg_frame, from_=1, to=100, textvariable=min_dmg_var,
                      width=5).pack(side="left", padx=2)
            tk.Label(dmg_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
            tk.Spinbox(dmg_frame, from_=1, to=100, textvariable=max_dmg_var,
                      width=5).pack(side="left", padx=2)
            
        elif base_item.get("type") == "armor":
            # Диапазон защиты
            def_frame = tk.Frame(ranges_frame, bg="#F5F5F5")
            def_frame.pack(fill="x", pady=3)
            
            tk.Label(def_frame, text="Диапазон защиты:", bg="#F5F5F5",
                    width=20, anchor="w").pack(side="left")
            
            min_def_var = tk.IntVar(value=loot_item.defense_range[0])
            max_def_var = tk.IntVar(value=loot_item.defense_range[1])
            
            tk.Spinbox(def_frame, from_=1, to=50, textvariable=min_def_var,
                      width=5).pack(side="left", padx=2)
            tk.Label(def_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
            tk.Spinbox(def_frame, from_=1, to=50, textvariable=max_def_var,
                      width=5).pack(side="left", padx=2)
        
        # Диапазон веса (для всех типов)
        weight_frame = tk.Frame(ranges_frame, bg="#F5F5F5")
        weight_frame.pack(fill="x", pady=3)
        
        tk.Label(weight_frame, text="Диапазон веса:", bg="#F5F5F5",
                width=20, anchor="w").pack(side="left")
        
        min_weight_var = tk.DoubleVar(value=loot_item.weight_range[0])
        max_weight_var = tk.DoubleVar(value=loot_item.weight_range[1])
        
        tk.Spinbox(weight_frame, from_=0.1, to=10.0, increment=0.1,
                  textvariable=min_weight_var, width=5).pack(side="left", padx=2)
        tk.Label(weight_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
        tk.Spinbox(weight_frame, from_=0.1, to=10.0, increment=0.1,
                  textvariable=max_weight_var, width=5).pack(side="left", padx=2)
        
        def save_changes():
            """Сохранить изменения предмета лута"""
            # Обновляем объект LootItem
            loot_item.name_prefix = prefix_var.get()
            loot_item.rarity = rarity_var.get()
            loot_item.drop_chance = chance_var.get()
            
            if base_item.get("type") == "weapon":
                loot_item.damage_range = (min_dmg_var.get(), max_dmg_var.get())
            elif base_item.get("type") == "armor":
                loot_item.defense_range = (min_def_var.get(), max_def_var.get())
            
            loot_item.weight_range = (min_weight_var.get(), max_weight_var.get())
            
            # Обновляем в текущем списке
            self.current_monster_loot_items[dialog.item_index] = loot_item
            
            # Обновляем отображение
            if hasattr(self, 'refresh_loot_display'):
                self.refresh_loot_display()
            
            messagebox.showinfo("✅", "Изменения сохранены!", parent=dialog)
            dialog.destroy()
        
        def delete_item():
            """Удалить предмет лута"""
            if messagebox.askyesno("🗑 Удаление", 
                                  "Вы уверены, что хотите удалить этот предмет из таблицы лута?",
                                  parent=dialog):
                self.remove_loot_item_from_monster(dialog.item_index)
                dialog.destroy()
        
        # Кнопки
        btn_frame = tk.Frame(dialog, bg="#F5F5F5", pady=10)
        btn_frame.pack(fill="x")
        
        tk.Button(btn_frame, text="💾 Сохранить изменения", bg="#4CAF50", fg="white",
                 font=("Arial", 10, "bold"), command=save_changes).pack(side="left", padx=5)
        
        tk.Button(btn_frame, text="🗑 Удалить предмет", bg="#f44336", fg="white",
                 font=("Arial", 10, "bold"), command=delete_item).pack(side="left", padx=5)
        
        tk.Button(btn_frame, text="❌ Отмена", bg="#757575", fg="white",
                 command=dialog.destroy).pack(side="left", padx=5)

    def add_loot_item_dialog(self, editor, location, refresh_callback):
        """Диалог добавления предмета в таблицу лута монстра"""
        dialog = tk.Toplevel(editor)
        dialog.title("➕ Добавить предмет в таблицу лута")
        dialog.geometry("500x400")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(editor)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#5E35B1", height=50)
        header_frame.pack(fill="x")
        tk.Label(header_frame, text="➕ ДОБАВЛЕНИЕ ПРЕДМЕТА В ТАБЛИЦУ ЛУТА", 
                 font=("Arial", 12, "bold"), bg="#5E35B1", fg="white").pack(pady=10)
        
        # Основной контейнер
        main_container = tk.Frame(dialog, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Выбор базового предмета
        tk.Label(main_container, text="Базовый предмет:", bg="#F5F5F5", 
                 font=("Arial", 10, "bold")).pack(anchor="w", pady=(0, 5))
        
        items_db = self.load_static_items()
        item_options = list(items_db.keys())
        
        item_var = tk.StringVar(value=item_options[0] if item_options else "")
        item_combo = ttk.Combobox(main_container, textvariable=item_var, 
                                 values=item_options, state="readonly", width=40)
        item_combo.pack(pady=5)
        
        # Поля для настроек
        tk.Label(main_container, text="Настройки предмета:", bg="#F5F5F5",
                 font=("Arial", 10, "bold")).pack(anchor="w", pady=(10, 5))
        
        settings_frame = tk.Frame(main_container, bg="#F5F5F5")
        settings_frame.pack(fill="x", pady=5)
        
        # Префикс названия
        tk.Label(settings_frame, text="Префикс названия:", bg="#F5F5F5", 
                 width=20, anchor="w").pack(side="left")
        prefix_var = tk.StringVar(value="Хороший")
        tk.Entry(settings_frame, textvariable=prefix_var, width=20).pack(side="left")
        
        # Редкость
        tk.Label(main_container, text="Редкость:", bg="#F5F5F5", 
                 font=("Arial", 9)).pack(anchor="w", pady=(5, 0))
        
        rarity_var = tk.StringVar(value="Обычный")
        rarity_frame = tk.Frame(main_container, bg="#F5F5F5")
        rarity_frame.pack(fill="x", pady=2)
        
        rarities = ["Обычный", "Необычный", "Редкий", "Эпический", "Легендарный"]
        for rarity in rarities:
            tk.Radiobutton(rarity_frame, text=rarity, variable=rarity_var, 
                          value=rarity, bg="#F5F5F5").pack(side="left", padx=2)
        
        # Шанс выпадения
        tk.Label(main_container, text="Шанс выпадения (%):", bg="#F5F5F5", 
                 font=("Arial", 9)).pack(anchor="w", pady=(5, 0))
        
        chance_var = tk.IntVar(value=10)
        tk.Spinbox(main_container, from_=1, to=100, textvariable=chance_var, 
                  width=10).pack(anchor="w", pady=2)
        
        # Диапазоны характеристик
        tk.Label(main_container, text="Диапазоны характеристик:", bg="#F5F5F5",
                 font=("Arial", 10, "bold")).pack(anchor="w", pady=(10, 5))
        
        ranges_frame = tk.Frame(main_container, bg="#F5F5F5")
        ranges_frame.pack(fill="x", pady=5)
        
        # В зависимости от типа предмета показываем разные поля
        def update_ranges():
            # Очищаем предыдущие поля
            for widget in ranges_frame.winfo_children():
                widget.destroy()
            
            selected_item = items_db.get(item_var.get(), {})
            item_type = selected_item.get("type", "unknown")
            
            if item_type == "weapon":
                # Диапазон урона
                tk.Label(ranges_frame, text="Диапазон урона:", bg="#F5F5F5",
                        width=15, anchor="w").pack(side="left")
                
                min_dmg_var = tk.IntVar(value=1)
                max_dmg_var = tk.IntVar(value=10)
                
                tk.Spinbox(ranges_frame, from_=1, to=100, textvariable=min_dmg_var,
                          width=5).pack(side="left", padx=2)
                tk.Label(ranges_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
                tk.Spinbox(ranges_frame, from_=1, to=100, textvariable=max_dmg_var,
                          width=5).pack(side="left", padx=2)
                
                # Диапазон веса
                tk.Label(ranges_frame, text="Диапазон веса:", bg="#F5F5F5",
                        width=15, anchor="w").pack(side="left", padx=(10, 0))
                
                min_weight_var = tk.DoubleVar(value=1.0)
                max_weight_var = tk.DoubleVar(value=3.0)
                
                tk.Spinbox(ranges_frame, from_=0.1, to=10.0, increment=0.1,
                          textvariable=min_weight_var, width=5).pack(side="left", padx=2)
                tk.Label(ranges_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
                tk.Spinbox(ranges_frame, from_=0.1, to=10.0, increment=0.1,
                          textvariable=max_weight_var, width=5).pack(side="left", padx=2)
                
                return {
                    "damage_range": (min_dmg_var, max_dmg_var),
                    "defense_range": None,
                    "weight_range": (min_weight_var, max_weight_var)
                }
            
            elif item_type == "armor":
                # Диапазон защиты
                tk.Label(ranges_frame, text="Диапазон защиты:", bg="#F5F5F5",
                        width=15, anchor="w").pack(side="left")
                
                min_def_var = tk.IntVar(value=1)
                max_def_var = tk.IntVar(value=5)
                
                tk.Spinbox(ranges_frame, from_=1, to=50, textvariable=min_def_var,
                          width=5).pack(side="left", padx=2)
                tk.Label(ranges_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
                tk.Spinbox(ranges_frame, from_=1, to=50, textvariable=max_def_var,
                          width=5).pack(side="left", padx=2)
                
                # Диапазон веса
                tk.Label(ranges_frame, text="Диапазон веса:", bg="#F5F5F5",
                        width=15, anchor="w").pack(side="left", padx=(10, 0))
                
                min_weight_var = tk.DoubleVar(value=1.0)
                max_weight_var = tk.DoubleVar(value=3.0)
                
                tk.Spinbox(ranges_frame, from_=0.1, to=10.0, increment=0.1,
                          textvariable=min_weight_var, width=5).pack(side="left", padx=2)
                tk.Label(ranges_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
                tk.Spinbox(ranges_frame, from_=0.1, to=10.0, increment=0.1,
                          textvariable=max_weight_var, width=5).pack(side="left", padx=2)
                
                return {
                    "damage_range": None,
                    "defense_range": (min_def_var, max_def_var),
                    "weight_range": (min_weight_var, max_weight_var)
                }
            
            else:
                # Для других типов предметов
                tk.Label(ranges_frame, text="Нет специальных характеристик", 
                        bg="#F5F5F5", fg="#757575").pack()
                
                # Диапазон веса
                tk.Label(ranges_frame, text="Диапазон веса:", bg="#F5F5F5",
                        width=15, anchor="w").pack(side="left", padx=(10, 0))
                
                min_weight_var = tk.DoubleVar(value=0.5)
                max_weight_var = tk.DoubleVar(value=2.0)
                
                tk.Spinbox(ranges_frame, from_=0.1, to=10.0, increment=0.1,
                          textvariable=min_weight_var, width=5).pack(side="left", padx=2)
                tk.Label(ranges_frame, text="до", bg="#F5F5F5").pack(side="left", padx=2)
                tk.Spinbox(ranges_frame, from_=0.1, to=10.0, increment=0.1,
                          textvariable=max_weight_var, width=5).pack(side="left", padx=2)
                
                return {
                    "damage_range": None,
                    "defense_range": None,
                    "weight_range": (min_weight_var, max_weight_var)
                }
        
        # Обновляем поля при изменении выбранного предмета
        ranges_vars = {}
        
        def on_item_change(*args):
            nonlocal ranges_vars
            ranges_vars = update_ranges()
        
        item_var.trace("w", on_item_change)
        # Инициализация полей
        ranges_vars = update_ranges()
        
        def add_loot_item():
            base_item_id = item_var.get()
            if not base_item_id:
                messagebox.showerror("Ошибка", "Выберите базовый предмет!", parent=dialog)
                return
            
            # Создаем объект LootItem
            loot_item = LootItem(
                base_item_id=base_item_id,
                name_prefix=prefix_var.get(),
                drop_chance=chance_var.get(),
                rarity=rarity_var.get()
            )
            
            # Устанавливаем диапазоны характеристик
            if ranges_vars.get("damage_range"):
                min_dmg, max_dmg = ranges_vars["damage_range"]
                loot_item.damage_range = (min_dmg.get(), max_dmg.get())
            
            if ranges_vars.get("defense_range"):
                min_def, max_def = ranges_vars["defense_range"]
                loot_item.defense_range = (min_def.get(), max_def.get())
            
            if ranges_vars.get("weight_range"):
                min_weight, max_weight = ranges_vars["weight_range"]
                loot_item.weight_range = (min_weight.get(), max_weight.get())
            
            # Добавляем в текущий список
            self.current_monster_loot_items.append(loot_item)
            
            # Обновляем отображение
            refresh_callback()
            
            messagebox.showinfo("✅", "Предмет добавлен в таблицу лута!", parent=dialog)
            dialog.destroy()
        
        # Кнопки
        btn_frame = tk.Frame(dialog, bg="#F5F5F5", pady=10)
        btn_frame.pack(fill="x")
        
        tk.Button(btn_frame, text="✅ Добавить", bg="#4CAF50", fg="white",
                 font=("Arial", 10, "bold"), command=add_loot_item).pack(side="left", padx=5)
        
        tk.Button(btn_frame, text="❌ Отмена", bg="#757575", fg="white",
                 command=dialog.destroy).pack(side="left", padx=5)

    # ================ РЕДАКТОР ПРЕДМЕТОВ ================
    def open_items_editor(self):
        """Открыть редактор предметов"""
        if not self.is_admin():
            return
            
        if self.editor_window and self.editor_window.winfo_exists():
            self.editor_window.lift()
            return
        
        editor = tk.Toplevel(self.root)
        self.editor_window = editor
        editor.title("🛠 Редактор вещей")
        editor.geometry("800x600")
        editor.configure(bg="#F5F5F5")
        
        canvas = tk.Canvas(editor, height=60, bg="#4A154B")
        canvas.pack(fill="x")
        canvas.create_rectangle(0, 0, 800, 30, fill="#6A1B9A", outline="")
        canvas.create_text(400, 30, text="🛠 PocketCombats — Редактор вещей", fill="white",
                           font=("Arial", 14, "bold"))
        
        items = self.load_items()
        
        # Собираем все предметы: как стандартные, так и сгенерированные
        all_items = {}
        for item_id, item_data in items.items():
            all_items[item_id] = item_data
        
        # Добавляем предметы из инвентаря игрока (сгенерированные)
        for item in self.player_data.get("inventory", []):
            if isinstance(item, dict):
                # Это сгенерированный предмет из лута
                item_id = item.get("id", f"loot_{len(all_items)}")
                all_items[item_id] = item
        
        main_frame = tk.Frame(editor, bg="#F5F5F5")
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas_scroll = tk.Canvas(main_frame, bg="white", relief="solid", bd=1)
        scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=canvas_scroll.yview)
        scrollable = tk.Frame(canvas_scroll, bg="white")
        
        scrollable.bind("<Configure>", lambda e: canvas_scroll.configure(scrollregion=canvas_scroll.bbox("all")))
        canvas_scroll.create_window((0, 0), window=scrollable, anchor="nw")
        canvas_scroll.configure(yscrollcommand=scrollbar.set)
        
        canvas_scroll.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        if not all_items:
            tk.Label(scrollable, text="Нет предметов у игрока", font=("Arial", 12), bg="white").pack(pady=40)
        else:
            for item_id, cfg in all_items.items():
                self.create_item_editor_card(scrollable, item_id, cfg, editor)
        
        btn_frame = tk.Frame(editor, bg="#F5F5F5")
        btn_frame.pack(side="bottom", fill="x", pady=10)
        tk.Button(btn_frame, text="➕ Добавить предмет", command=lambda: self.add_item_dialog(editor), bg="#2196F3",
                  fg="white").pack(side="left", padx=5)
        tk.Button(btn_frame, text="💾 Сохранить всё", bg="#4CAF50", fg="white",
                  command=lambda: [self.save_items(items), messagebox.showinfo("✅", "Сохранено!")]
                  ).pack(side="left", padx=5)
        
        editor.protocol("WM_DELETE_WINDOW",
                       lambda: [editor.destroy(), setattr(self, 'editor_window', None)])

    def create_item_editor_card(self, parent, item_id, cfg, editor):
        """Создать карточку редактирования предмета"""
        frame = tk.Frame(parent, relief="groove", bd=1, padx=15, pady=15, bg="white")
        frame.pack(fill="x", padx=5, pady=10)
        
        # Определяем, является ли предмет сгенерированным
        is_generated = "base_item_id" in cfg
        
        if is_generated:
            tk.Label(frame, text=f"Сгенерированный предмет: {item_id}", font=("Arial", 11, "bold"), bg="white", fg="#9C27B0").pack(anchor="w")
        else:
            tk.Label(frame, text=f"Предмет: {item_id}", font=("Arial", 11, "bold"), bg="white").pack(anchor="w")
        
        item_name = cfg.get("name", "Предмет")
        if is_generated:
            base_item_id = cfg.get("base_item_id")
            base_items = self.load_static_items()
            base_item = base_items.get(base_item_id, {})
            base_name = base_item.get("name", "Предмет")
            prefix = cfg.get("name_prefix", "")
            item_name = f"{prefix} {base_name}".strip()
        
        tk.Label(frame, text=f"Название: «{item_name}»", fg="#666", bg="white").pack(anchor="w", pady=(0, 5))
        
        # Для сгенерированных предметов показываем специальную информацию
        if is_generated:
            gen_info_frame = tk.Frame(frame, bg="#F3E5F5", relief="ridge", bd=1, padx=10, pady=5)
            gen_info_frame.pack(fill="x", pady=(0, 10))
            
            tk.Label(gen_info_frame, text="📦 Сгенерированный предмет", font=("Arial", 9, "bold"), 
                    bg="#F3E5F5", fg="#7B1FA2").pack(anchor="w")
            
            info_text = f"Базовый предмет: {cfg.get('base_item_id')}"
            if "rarity" in cfg:
                info_text += f" | Редкость: {cfg.get('rarity')}"
            tk.Label(gen_info_frame, text=info_text, font=("Arial", 8), 
                    bg="#F3E5F5", fg="#7B1FA2").pack(anchor="w")
        
        fields = [("Название", "name", 25), ("Вес", "weight", 6), ("Иконка", "icon", 4)]
        vars = {}
        
        for label, key, width in fields:
            row = tk.Frame(frame, bg="white")
            row.pack(fill="x", pady=1)
            tk.Label(row, text=label + ":", width=12, anchor="w", bg="white").pack(side="left")
            var = tk.StringVar(value=str(cfg.get(key, "")))
            tk.Entry(row, textvariable=var, width=width or 15).pack(side="left")
            vars[key] = var
        
        # Для сгенерированных предметов тип не редактируется
        if not is_generated:
            type_var = tk.StringVar(value=cfg.get("type", "armor"))
            tk.Label(frame, text="Тип:", bg="white", anchor="w").pack(anchor="w", pady=(5, 0))
            
            type_frame = tk.Frame(frame, bg="white")
            type_frame.pack(anchor="w")
            tk.Radiobutton(type_frame, text="Броня", variable=type_var, value="armor", bg="white").pack(side="left")
            tk.Radiobutton(type_frame, text="Оружие", variable=type_var, value="weapon", bg="white").pack(side="left")
            tk.Radiobutton(type_frame, text="Расходник", variable=type_var, value="consumable", bg="white").pack(side="left")
            vars["type"] = type_var
            
            subtype_frame = tk.Frame(frame, bg="white")
            subtype_frame.pack(anchor="w", pady=3)
            subtype_var = tk.StringVar(value=cfg.get("subtype", "body"))
            vars["subtype"] = subtype_var
            
            def update_subtype_options():
                for widget in subtype_frame.winfo_children():
                    widget.destroy()
                tk.Label(subtype_frame, text="Подтип:", bg="white").pack(side="left", padx=(0, 5))
                if type_var.get() == "armor":
                    opts = [("Голова", "head"), ("Тело", "body"), ("Руки", "hands"), ("Ноги", "feet")]
                elif type_var.get() == "weapon":
                    opts = [("Ближний", "melee"), ("Дальний", "ranged")]
                else:  # consumable
                    opts = [("Зелье", "potion"), ("Еда", "food"), ("Свиток", "scroll")]
                for text, val in opts:
                    tk.Radiobutton(subtype_frame, text=text, variable=subtype_var, value=val, bg="white").pack(side="left")
            
            type_var.trace("w", lambda *a: update_subtype_options())
            update_subtype_options()
            
            # ТРЕБОВАНИЕ КЛАССА ДЛЯ ОРУЖИЯ
            class_req_frame = tk.Frame(frame, bg="white")
            class_req_frame.pack(anchor="w", pady=3)
            
            class_req_var = tk.StringVar(value=cfg.get("class_requirement", ""))
            vars["class_requirement"] = class_req_var
            
            def update_class_req_options():
                for widget in class_req_frame.winfo_children():
                    widget.destroy()
                
                tk.Label(class_req_frame, text="Требование класса:", bg="white").pack(side="left", padx=(0, 5))
                
                if type_var.get() == "weapon":
                    opts = [("Нет", ""), ("Воин", "Воин"), ("Маг", "Маг"), ("Охотник", "Охотник")]
                    for text, val in opts:
                        tk.Radiobutton(class_req_frame, text=text, variable=class_req_var, value=val, bg="white").pack(side="left")
                else:
                    tk.Label(class_req_frame, text="(только для оружия)", bg="white", fg="#999").pack(side="left")
                    class_req_var.set("")
            
            type_var.trace("w", lambda *a: update_class_req_options())
            update_class_req_options()
            
            stat_frame = tk.Frame(frame, bg="white")
            stat_frame.pack(anchor="w", pady=3)
            stat_var = tk.StringVar(value=str(cfg.get("damage" if type_var.get() == "weapon" else 
                                                   "defense" if type_var.get() == "armor" else 
                                                   "value", 0)))
            vars["stat"] = stat_var
            
            def update_stat_label():
                for widget in stat_frame.winfo_children():
                    widget.destroy()
                if type_var.get() == "weapon":
                    label = "Урон:"
                elif type_var.get() == "armor":
                    label = "Защита:"
                else:
                    label = "Значение:"
                tk.Label(stat_frame, text=label, bg="white").pack(side="left")
                tk.Entry(stat_frame, textvariable=stat_var, width=6).pack(side="left")
            
            type_var.trace("w", lambda *a: update_stat_label())
            update_stat_label()
            
            # Эффект для расходников
            effect_frame = tk.Frame(frame, bg="white")
            effect_frame.pack(anchor="w", pady=3)
            effect_var = tk.StringVar(value=cfg.get("effect", "heal"))
            vars["effect"] = effect_var
            
            def update_effect_options():
                for widget in effect_frame.winfo_children():
                    widget.destroy()
                
                if type_var.get() == "consumable":
                    tk.Label(effect_frame, text="Эффект:", bg="white").pack(side="left", padx=(0, 5))
                    opts = [("Лечение", "heal"), ("Мана", "mana"), ("Оба", "both")]
                    for text, val in opts:
                        tk.Radiobutton(effect_frame, text=text, variable=effect_var, value=val, bg="white").pack(side="left")
                else:
                    effect_var.set("heal")
            
            type_var.trace("w", lambda *a: update_effect_options())
            update_effect_options()
            
            # ТРЕБОВАНИЕ УРОВНЯ
            level_req_frame = tk.Frame(frame, bg="white")
            level_req_frame.pack(anchor="w", pady=3)

            level_req_var = tk.StringVar(value=str(cfg.get("level_requirement", 1)))
            vars["level_requirement"] = level_req_var

            tk.Label(level_req_frame, text="Требуемый уровень:", bg="white", width=15, anchor="w").pack(side="left")
            tk.Spinbox(level_req_frame, from_=1, to=50, textvariable=level_req_var, width=6).pack(side="left")
        
        btns = tk.Frame(frame, bg="white")
        btns.pack(pady=8)
        
        if not is_generated:
            tk.Button(btns, text="✅ Применить", bg="#4CAF50", fg="white", width=12,
                      command=lambda: self.apply_item_edit(item_id, vars, cfg, editor)).pack(side="left", padx=2)
        
        tk.Button(btns, text="🗑 Удалить", bg="#f44336", fg="white", width=12,
                  command=lambda: self.delete_item(item_id, editor)).pack(side="left", padx=2)

    def apply_item_edit(self, item_id, vars, cfg, editor):
        """Применить изменения к предмету"""
        try:
            cfg.update({
                "name": vars["name"].get(),
                "weight": float(vars["weight"].get()),
                "icon": vars["icon"].get(),
                "type": vars["type"].get(),
                "subtype": vars["subtype"].get(),
                "level_requirement": int(vars.get("level_requirement", tk.StringVar(value="1")).get())
            })
            
            if vars["type"].get() == "weapon":
                cfg["class_requirement"] = vars["class_requirement"].get()
                cfg["damage"] = int(vars["stat"].get())
                cfg.pop("defense", None)
                cfg.pop("value", None)
                cfg.pop("effect", None)
            elif vars["type"].get() == "armor":
                cfg["defense"] = int(vars["stat"].get())
                cfg.pop("damage", None)
                cfg.pop("value", None)
                cfg.pop("effect", None)
                cfg.pop("class_requirement", None)
            else:  # consumable
                cfg["value"] = int(vars["stat"].get())
                cfg["effect"] = vars["effect"].get()
                cfg.pop("damage", None)
                cfg.pop("defense", None)
                cfg.pop("class_requirement", None)
            
            items = self.load_items()
            items[item_id] = cfg
            self.save_items(items)
            self.refresh_current_view()
            messagebox.showinfo("✅", f"Обновлено: {item_id}")
        except Exception as e:
            messagebox.showerror("❌ Ошибка", f"Некорректные данные:\n{e}")

    def delete_item(self, item_id, editor):
        """Удалить предмет"""
        if messagebox.askyesno("🗑 Удалить", f"Удалить предмет '{item_id}'?"):
            items = self.load_items()
            
            # Проверяем, является ли это сгенерированным предметом
            if item_id in items:
                # Это стандартный предмет
                del items[item_id]
                self.save_items(items)
                
                if item_id in self.player_data["inventory"]:
                    self.player_data["inventory"].remove(item_id)
            else:
                # Это сгенерированный предмет - ищем в инвентаре
                self.player_data["inventory"] = [
                    item for item in self.player_data["inventory"] 
                    if not (isinstance(item, dict) and item.get("id") == item_id)
                ]
            
            # Удаляем из экипировки
            for slot, equipped_item in list(self.player_data.get("equipped", {}).items()):
                if isinstance(equipped_item, dict) and equipped_item.get("id") == item_id:
                    self.player_data["equipped"].pop(slot, None)
                elif equipped_item == item_id:
                    self.player_data["equipped"].pop(slot, None)
            
            # Удаляем из сундука
            self.chest_items = [
                item for item in self.chest_items 
                if not (isinstance(item, dict) and item.get("id") == item_id) and item != item_id
            ]
            self.save_chest()
            
            self.save_current_player()
            self.refresh_current_view()
            editor.destroy()
            self.open_items_editor()

    def add_item_dialog(self, editor):
        """Диалог добавления нового предмета"""
        dialog = tk.Toplevel(editor)
        dialog.title("➕ Новый предмет")
        dialog.geometry("400x600")
        dialog.transient(editor)
        dialog.grab_set()
        
        canvas = tk.Canvas(dialog, bg="#F5F5F5")
        scrollbar = tk.Scrollbar(dialog, orient="vertical", command=canvas.yview)
        scrollable = tk.Frame(canvas, bg="#F5F5F5")
        
        scrollable.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="top", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        item_id = tk.StringVar(value="new_item")
        name = tk.StringVar(value="Новый предмет")
        weight = tk.StringVar(value="1.0")
        icon = tk.StringVar(value="📦")
        item_type = tk.StringVar(value="armor")
        subtype = tk.StringVar(value="body")
        class_req = tk.StringVar(value="")
        stat = tk.StringVar(value="1")
        effect = tk.StringVar(value="heal")
        level_req = tk.IntVar(value=1)
        add_inv = tk.BooleanVar(value=True)
        
        tk.Label(scrollable, text="ID предмета:", bg="#F5F5F5").pack(pady=(10, 0))
        tk.Entry(scrollable, textvariable=item_id).pack()
        tk.Label(scrollable, text="Название:", bg="#F5F5F5").pack()
        tk.Entry(scrollable, textvariable=name).pack()
        tk.Label(scrollable, text="Вес:", bg="#F5F5F5").pack()
        tk.Entry(scrollable, textvariable=weight).pack()
        tk.Label(scrollable, text="Иконка:", bg="#F5F5F5").pack()
        tk.Entry(scrollable, textvariable=icon).pack()
        tk.Label(scrollable, text="Тип:", bg="#F5F5F5").pack()
        tk.Radiobutton(scrollable, text="Броня", variable=item_type, value="armor", bg="#F5F5F5").pack()
        tk.Radiobutton(scrollable, text="Оружие", variable=item_type, value="weapon", bg="#F5F5F5").pack()
        tk.Radiobutton(scrollable, text="Расходник", variable=item_type, value="consumable", bg="#F5F5F5").pack()
        
        subtype_frame = tk.Frame(scrollable, bg="#F5F5F5")
        subtype_frame.pack()
        tk.Label(subtype_frame, text="Подтип:", bg="#F5F5F5").pack()
        
        def update_subtype():
            for w in subtype_frame.winfo_children()[1:]:
                w.destroy()
            if item_type.get() == "armor":
                opts = [("Голова", "head"), ("Тело", "body"), ("Руки", "hands"), ("Ноги", "feet")]
            elif item_type.get() == "weapon":
                opts = [("Ближний", "melee"), ("Дальний", "ranged")]
            else:  # consumable
                opts = [("Зелье", "potion"), ("Еда", "food"), ("Свиток", "scroll")]
            for text, val in opts:
                tk.Radiobutton(subtype_frame, text=text, variable=subtype, value=val, bg="#F5F5F5").pack(anchor="w")
        
        item_type.trace("w", lambda *a: update_subtype())
        update_subtype()
        
        # ТРЕБОВАНИЕ КЛАССА
        class_req_frame = tk.Frame(scrollable, bg="#F5F5F5")
        class_req_frame.pack(pady=5)
        tk.Label(class_req_frame, text="Требование класса:", bg="#F5F5F5").pack(anchor="w")
        
        def update_class_req():
            for w in class_req_frame.winfo_children()[1:]:
                w.destroy()
            
            if item_type.get() == "weapon":
                tk.Label(class_req_frame, text="(только для оружия)", bg="#F5F5F5", fg="#999", font=("Arial", 8)).pack(anchor="w")
                opts_frame = tk.Frame(class_req_frame, bg="#F5F5F5")
                opts_frame.pack()
                opts = [("Нет", ""), ("Воин", "Воин"), ("Маг", "Маг"), ("Охотник", "Охотник")]
                for text, val in opts:
                    tk.Radiobutton(opts_frame, text=text, variable=class_req, value=val, bg="#F5F5F5").pack(side="left")
            else:
                tk.Label(class_req_frame, text="(только для оружия)", bg="#F5F5F5", fg="#999").pack(anchor="w")
                class_req.set("")
        
        item_type.trace("w", lambda *a: update_class_req())
        update_class_req()
        
        stat_frame = tk.Frame(scrollable, bg="#F5F5F5")
        stat_frame.pack(pady=5)
        
        def update_stat_label():
            for w in stat_frame.winfo_children():
                w.destroy()
            
            if item_type.get() == "weapon":
                label = "Урон:"
            elif item_type.get() == "armor":
                label = "Защита:"
            else:
                label = "Значение:"
            
            tk.Label(stat_frame, text=label, bg="#F5F5F5").pack(anchor="w")
            tk.Entry(stat_frame, textvariable=stat).pack()
        
        item_type.trace("w", lambda *a: update_stat_label())
        update_stat_label()
        
        effect_frame = tk.Frame(scrollable, bg="#F5F5F5")
        effect_frame.pack(pady=5)
    
        def update_effect_options():
            for w in effect_frame.winfo_children():
                w.destroy()
        
            if item_type.get() == "consumable":
                tk.Label(effect_frame, text="Эффект:", bg="#F5F5F5").pack(anchor="w")
                opts_frame = tk.Frame(effect_frame, bg="#F5F5F5")
                opts_frame.pack()
                opts = [("Лечение", "heal"), ("Мана", "mana"), ("Оба", "both")]
                for text, val in opts:
                    tk.Radiobutton(opts_frame, text=text, variable=effect, value=val, bg="#F5F5F5").pack(side="left")
        
        item_type.trace("w", lambda *a: update_effect_options())
        update_effect_options()
        
        # ТРЕБОВАНИЕ УРОВНЯ
        tk.Label(scrollable, text="Требуемый уровень:", bg="#F5F5F5").pack(pady=(5, 0))
        tk.Spinbox(scrollable, from_=1, to=50, textvariable=level_req, width=10).pack(pady=2)
        
        tk.Checkbutton(scrollable, text="➕ Добавить в инвентарь", variable=add_inv, bg="#F5F5F5").pack(pady=5)
        
        def add():
            iid = item_id.get().strip()
            if not iid:
                messagebox.showerror("Ошибка", "ID обязателен", parent=dialog)
                return
            
            items = self.load_items()
            if iid in items:
                messagebox.showerror("Ошибка", "ID уже существует", parent=dialog)
                return
            
            try:
                items[iid] = {
                    "name": name.get(),
                    "weight": float(weight.get()),
                    "icon": icon.get(),
                    "type": item_type.get(),
                    "subtype": subtype.get(),
                    "level_requirement": level_req.get()
                }
                
                if item_type.get() == "weapon":
                    items[iid]["class_requirement"] = class_req.get()
                    items[iid]["damage"] = int(stat.get())
                elif item_type.get() == "armor":
                    items[iid]["defense"] = int(stat.get())
                else:  # consumable
                    items[iid]["value"] = int(stat.get())
                    items[iid]["effect"] = effect.get()
                
                self.save_items(items)
                
                if add_inv.get():
                    if iid not in self.player_data["inventory"]:
                        self.player_data["inventory"].append(iid)
                        self.save_current_player()
                
                self.refresh_current_view()
                dialog.destroy()
                editor.destroy()
                self.open_items_editor()
            except Exception as e:
                messagebox.showerror("Ошибка", f"Неверные данные:\n{e}", parent=dialog)
        
        tk.Button(scrollable, text="✅ Добавить", bg="#4CAF50", fg="white", command=add).pack(pady=20)
    # ================ РЕДАКТОР УМЕНИЙ ================
    def open_abilities_editor(self):
        """Открыть редактор умений"""
        if not self.is_admin():
            return
            
        if self.editor_window and self.editor_window.winfo_exists():
            self.editor_window.lift()
            return
        
        editor = tk.Toplevel(self.root)
        self.editor_window = editor
        editor.title("🛠 Редактор умений")
        editor.geometry("800x600")
        editor.configure(bg="#F5F5F5")
        
        canvas = tk.Canvas(editor, height=60, bg="#4A154B")
        canvas.pack(fill="x")
        canvas.create_rectangle(0, 0, 800, 30, fill="#6A1B9A", outline="")
        canvas.create_text(400, 30, text="🛠 PocketCombats — Редактор умений", fill="white",
                           font=("Arial", 14, "bold"))
        
        main_frame = tk.Frame(editor, bg="#F5F5F5")
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas_scroll = tk.Canvas(main_frame, bg="white", relief="solid", bd=1)
        scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=canvas_scroll.yview)
        scrollable = tk.Frame(canvas_scroll, bg="white")
        
        scrollable.bind("<Configure>", lambda e: canvas_scroll.configure(scrollregion=canvas_scroll.bbox("all")))
        canvas_scroll.create_window((0, 0), window=scrollable, anchor="nw")
        canvas_scroll.configure(yscrollcommand=scrollbar.set)
        
        canvas_scroll.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        if not self.abilities:
            tk.Label(scrollable, text="Нет созданных умений", font=("Arial", 12), bg="white").pack(pady=40)
        else:
            for ab_id, ability in self.abilities.items():
                self.create_ability_editor_card(scrollable, ab_id, ability, editor)
        
        btn_frame = tk.Frame(editor, bg="#F5F5F5")
        btn_frame.pack(side="bottom", fill="x", pady=10)
        tk.Button(btn_frame, text="➕ Добавить умение", command=lambda: self.add_ability_dialog(editor), bg="#2196F3",
                  fg="white").pack(side="left", padx=5)
        tk.Button(btn_frame, text="💾 Сохранить всё", bg="#4CAF50", fg="white",
                  command=lambda: [self.save_abilities(), messagebox.showinfo("✅", "Сохранено!")]
                  ).pack(side="left", padx=5)
        
        editor.protocol("WM_DELETE_WINDOW",
                       lambda: [editor.destroy(), setattr(self, 'editor_window', None)])

    def create_ability_editor_card(self, parent, ab_id, ability, editor):
        """Создать карточку редактирования умения"""
        frame = tk.Frame(parent, relief="groove", bd=1, padx=15, pady=15, bg="white")
        frame.pack(fill="x", padx=5, pady=10)
        
        tk.Label(frame, text=f"Умение: {ab_id}", font=("Arial", 11, "bold"), bg="white").pack(anchor="w")
        tk.Label(frame, text=f"Название: «{ability.name}»", fg="#666", bg="white").pack(anchor="w", pady=(0, 5))
        
        fields = [
            ("Название", "name", 25),
            ("Иконка", "icon", 4),
            ("Описание", "description", 40),
            ("Перезарядка", "cooldown", 4),
            ("Мана", "mana_cost", 4)
        ]
        vars = {}
        
        for label, key, width in fields:
            row = tk.Frame(frame, bg="white")
            row.pack(fill="x", pady=1)
            tk.Label(row, text=label + ":", width=12, anchor="w", bg="white").pack(side="left")
            if key in ["name", "icon", "description"]:
                var = tk.StringVar(value=str(getattr(ability, key, "")))
                tk.Entry(row, textvariable=var, width=width or 15).pack(side="left")
            else:
                var = tk.StringVar(value=str(getattr(ability, key, 0)))
                tk.Entry(row, textvariable=var, width=width or 8).pack(side="left")
            vars[key] = var
        
        # Класс умения
        class_frame = tk.Frame(frame, bg="white")
        class_frame.pack(fill="x", pady=3)
        tk.Label(class_frame, text="Класс:", bg="white", width=12, anchor="w").pack(side="left")
        class_var = tk.StringVar(value=ability.class_requirement)
        classes = ["Воин", "Маг", "Охотник"]
        for cls in classes:
            tk.Radiobutton(class_frame, text=cls, variable=class_var, value=cls, bg="white").pack(side="left", padx=2)
        vars["class_requirement"] = class_var
        
        # Тип эффекта
        effect_frame = tk.Frame(frame, bg="white")
        effect_frame.pack(fill="x", pady=3)
        tk.Label(effect_frame, text="Тип эффекта:", bg="white", width=12, anchor="w").pack(side="left")
        effect_var = tk.StringVar(value=ability.effect_type)
        effects = ["damage", "defense", "stun"]
        for eff in effects:
            tk.Radiobutton(effect_frame, text=eff, variable=effect_var, value=eff, bg="white").pack(side="left", padx=2)
        vars["effect_type"] = effect_var
        
        # Значение эффекта
        value_frame = tk.Frame(frame, bg="white")
        value_frame.pack(fill="x", pady=3)
        tk.Label(value_frame, text="Значение:", bg="white", width=12, anchor="w").pack(side="left")
        value_var = tk.StringVar(value=str(ability.value or ""))
        tk.Entry(value_frame, textvariable=value_var, width=15).pack(side="left")
        vars["value"] = value_var
        
        btns = tk.Frame(frame, bg="white")
        btns.pack(pady=8)
        tk.Button(btns, text="✅ Применить", bg="#4CAF50", fg="white", width=12,
                  command=lambda: self.apply_ability_edit(ab_id, vars, ability, editor)).pack(side="left", padx=2)
        tk.Button(btns, text="🗑 Удалить", bg="#f44336", fg="white", width=12,
                  command=lambda: self.delete_ability(ab_id, editor)).pack(side="left", padx=2)

    def apply_ability_edit(self, ab_id, vars, ability, editor):
        """Применить изменения к умению"""
        try:
            ability.name = vars["name"].get()
            ability.icon = vars["icon"].get()
            ability.description = vars["description"].get()
            ability.cooldown = int(vars["cooldown"].get())
            ability.mana_cost = int(vars["mana_cost"].get())
            ability.class_requirement = vars["class_requirement"].get()
            ability.effect_type = vars["effect_type"].get()
            ability.value = vars["value"].get()
            
            self.save_abilities()
            self.refresh_current_view()
            messagebox.showinfo("✅", f"Обновлено: {ability.name}")
        except Exception as e:
            messagebox.showerror("❌ Ошибка", f"Некорректные данные:\n{e}")

    def delete_ability(self, ab_id, editor):
        """Удалить умение"""
        if messagebox.askyesno("🗑 Удалить", f"Удалить умение '{ab_id}'?"):
            if ab_id in self.abilities:
                del self.abilities[ab_id]
                
                if ab_id in self.equipped_abilities:
                    self.equipped_abilities.remove(ab_id)
                    self.player_data["equipped_abilities"] = self.equipped_abilities
                    self.save_current_player()
                
                self.save_abilities()
                self.refresh_current_view()
                editor.destroy()
                self.open_abilities_editor()

    def add_ability_dialog(self, editor):
        """Диалог добавления нового умения"""
        dialog = tk.Toplevel(editor)
        dialog.title("➕ Новое умение")
        dialog.geometry("400x500")
        dialog.transient(editor)
        dialog.grab_set()
        
        tk.Label(dialog, text="➕ СОЗДАНИЕ НОВОГО УМЕНИЯ", font=("Arial", 12, "bold"), 
                bg="#F5F5F5", fg="#5E35B1").pack(pady=(10, 20))
        
        ab_id = tk.StringVar(value=f"ability_{len(self.abilities) + 1}")
        name = tk.StringVar(value="Новое умение")
        icon = tk.StringVar(value="✨")
        description = tk.StringVar(value="Описание умения")
        cooldown = tk.IntVar(value=2)
        mana_cost = tk.IntVar(value=10)
        class_req = tk.StringVar(value="Воин")
        effect_type = tk.StringVar(value="damage")
        value = tk.StringVar(value="")
        
        fields = [
            ("ID умения:", ab_id),
            ("Название:", name),
            ("Иконка:", icon),
            ("Описание:", description),
            ("Перезарядка:", cooldown),
            ("Мана:", mana_cost),
            ("Значение:", value)
        ]
        
        for i, (label, var) in enumerate(fields):
            tk.Label(dialog, text=label, bg="#F5F5F5").pack(anchor="w", padx=20, pady=(5, 0))
            if isinstance(var, tk.IntVar):
                tk.Spinbox(dialog, from_=0, to=10, textvariable=var, width=30).pack(padx=20, pady=2)
            else:
                tk.Entry(dialog, textvariable=var, width=30).pack(padx=20, pady=2)
        
        # Класс
        tk.Label(dialog, text="Класс:", bg="#F5F5F5").pack(anchor="w", padx=20, pady=(10, 0))
        class_frame = tk.Frame(dialog, bg="#F5F5F5")
        class_frame.pack(padx=20, pady=5)
        for cls in ["Воин", "Маг", "Охотник"]:
            tk.Radiobutton(class_frame, text=cls, variable=class_req, value=cls, bg="#F5F5F5").pack(side="left", padx=5)
        
        # Тип эффекта
        tk.Label(dialog, text="Тип эффекта:", bg="#F5F5F5").pack(anchor="w", padx=20, pady=(10, 0))
        effect_frame = tk.Frame(dialog, bg="#F5F5F5")
        effect_frame.pack(padx=20, pady=5)
        for eff in ["damage", "defense", "stun"]:
            tk.Radiobutton(effect_frame, text=eff, variable=effect_type, value=eff, bg="#F5F5F5").pack(side="left", padx=5)
        
        def add():
            iid = ab_id.get().strip()
            if not iid:
                messagebox.showerror("Ошибка", "ID обязателен", parent=dialog)
                return
            
            if iid in self.abilities:
                messagebox.showerror("Ошибка", "ID уже существует", parent=dialog)
                return
            
            try:
                self.abilities[iid] = Ability(
                    id=iid,
                    name=name.get(),
                    description=description.get(),
                    icon=icon.get(),
                    class_requirement=class_req.get(),
                    cooldown=cooldown.get(),
                    mana_cost=mana_cost.get(),
                    effect_type=effect_type.get(),
                    value=value.get() if value.get() else None
                )
                
                self.save_abilities()
                dialog.destroy()
                editor.destroy()
                self.open_abilities_editor()
            except Exception as e:
                messagebox.showerror("Ошибка", f"Неверные данные:\n{e}", parent=dialog)
        
        tk.Button(dialog, text="✅ Добавить", bg="#4CAF50", fg="white", command=add).pack(pady=20)

        # ================ РЕДАКТОР ИГРОКОВ (АДМИН ПАНЕЛЬ) ================
    def open_players_editor(self):
        """Открыть редактор игроков (только для админа)"""
        if not self.is_admin():
            messagebox.showinfo("Доступ запрещен", "Эта функция доступна только администратору.")
            return
        
        if self.editor_window and self.editor_window.winfo_exists():
            self.editor_window.lift()
            return
        
        editor = tk.Toplevel(self.root)
        self.editor_window = editor
        editor.title("👥 Редактор игроков (Админ)")
        editor.geometry("900x700")
        editor.configure(bg="#F5F5F5")
        
        # === ЗАГОЛОВОК ===
        header_canvas = tk.Canvas(editor, height=60, bg="#4A154B", highlightthickness=0)
        header_canvas.pack(fill="x")
        header_canvas.create_rectangle(0, 0, 900, 30, fill="#6A1B9A", outline="")
        header_canvas.create_text(450, 30, text="👥 РЕДАКТОР ИГРОКОВ - АДМИН ПАНЕЛЬ", fill="white",
                                  font=("Arial", 14, "bold"))
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(editor, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True)
        
        editor_canvas = tk.Canvas(main_container, bg="#F5F5F5", highlightthickness=0)
        editor_scrollbar = tk.Scrollbar(main_container, orient="vertical", command=editor_canvas.yview)
        editor_scrollable_frame = tk.Frame(editor_canvas, bg="#F5F5F5")
        
        editor_scrollable_frame.bind("<Configure>", lambda e: editor_canvas.configure(scrollregion=editor_canvas.bbox("all")))
        editor_canvas.create_window((0, 0), window=editor_scrollable_frame, anchor="nw")
        editor_canvas.configure(yscrollcommand=editor_scrollbar.set)
        
        editor_canvas.pack(side="left", fill="both", expand=True, padx=(10, 0))
        editor_scrollbar.pack(side="right", fill="y")
        
        # Заголовок с выбором игрока
        header_frame = tk.Frame(editor_scrollable_frame, bg="#F5F5F5", pady=10)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text="Выберите игрока:", bg="#F5F5F5", 
                 font=("Arial", 11, "bold")).pack(side="left", padx=(20, 5))
        
        # Получаем список всех игроков
        all_players = self.db.get_all_players()
        current_player = self.player_data.get("username", "")
        
        player_var = tk.StringVar(value=current_player)
        player_dropdown = ttk.Combobox(header_frame, textvariable=player_var, 
                                       values=all_players, state="readonly", width=30)
        player_dropdown.pack(side="left", padx=5)
        
        # Кнопка обновления списка
        refresh_btn = tk.Button(header_frame, text="🔄", font=("Arial", 10),
                               bg="#2196F3", fg="white", width=3,
                               command=lambda: self.refresh_players_list(editor))
        refresh_btn.pack(side="left", padx=2)
        
        # Информационная рамка
        info_frame = tk.Frame(editor_scrollable_frame, bg="#E3F2FD", relief="ridge", bd=2, padx=15, pady=10)
        info_frame.pack(fill="x", padx=20, pady=(0, 15))
        
        tk.Label(info_frame, text="ℹ️ ИНФОРМАЦИЯ", font=("Arial", 11, "bold"), 
                 bg="#E3F2FD", fg="#1565C0").pack(anchor="w", pady=(0, 5))
        
        info_text = "Выберите игрока для управления. Вы можете:\n"
        info_text += "1. Просмотреть и редактировать инвентарь\n"
        info_text += "2. Управлять экипировкой\n"
        info_text += "3. Заблокировать/разблокировать игрока\n"
        info_text += "4. Удалить игрока (осторожно!)"
        
        tk.Label(info_frame, text=info_text, font=("Arial", 9), 
                 bg="#E3F2FD", fg="#0D47A1", justify="left").pack(anchor="w")
        
        # Контейнер для информации о выбранном игроке
        self.player_info_container = tk.Frame(editor_scrollable_frame, bg="#F5F5F5")
        self.player_info_container.pack(fill="both", expand=True, padx=20, pady=10)
        
        # Создаем Notebook для вкладок
        self.players_notebook = ttk.Notebook(self.player_info_container)
        self.players_notebook.pack(fill="both", expand=True)
        
        # Вкладка информации об игроке
        self.info_tab = tk.Frame(self.players_notebook, bg="#F5F5F5")
        self.players_notebook.add(self.info_tab, text="📊 Информация")
        
        # Вкладка инвентаря
        self.inventory_tab = tk.Frame(self.players_notebook, bg="#F5F5F5")
        self.players_notebook.add(self.inventory_tab, text="🎒 Инвентарь")
        
        # Вкладка экипировки
        self.equipment_tab = tk.Frame(self.players_notebook, bg="#F5F5F5")
        self.players_notebook.add(self.equipment_tab, text="🎽 Экипировка")
        
        # Вкладка управления
        self.management_tab = tk.Frame(self.players_notebook, bg="#F5F5F5")
        self.players_notebook.add(self.management_tab, text="⚙️ Управление")
        
        # Инициализируем с текущим игроком
        self.display_player_info(current_player)
        
        # Привязываем изменение выбора игрока
        def on_player_selected(*args):
            selected_player = player_var.get()
            self.display_player_info(selected_player)
        
        player_var.trace("w", on_player_selected)
        
        # Кнопка закрытия
        btn_frame = tk.Frame(editor_scrollable_frame, bg="#F5F5F5")
        btn_frame.pack(side="bottom", fill="x", pady=10)
        
        tk.Button(btn_frame, text="❌ Закрыть", bg="#757575", fg="white",
                 font=("Arial", 10, "bold"), width=15,
                 command=editor.destroy).pack()
        
        editor.protocol("WM_DELETE_WINDOW",
                       lambda: [editor.destroy(), setattr(self, 'editor_window', None)])

    def refresh_players_list(self, editor):
        """Обновить список игроков"""
        all_players = self.db.get_all_players()
        current_player = self.player_data.get("username", "")
        
        # Обновляем выпадающий список
        for widget in editor.winfo_children():
            if isinstance(widget, tk.Toplevel):
                for child in widget.winfo_children():
                    if isinstance(child, tk.Frame):
                        for grandchild in child.winfo_children():
                            if isinstance(grandchild, tk.Frame):
                                for greatgrandchild in grandchild.winfo_children():
                                    if isinstance(greatgrandchild, ttk.Combobox):
                                        greatgrandchild['values'] = all_players
                                        if current_player in all_players:
                                            greatgrandchild.set(current_player)
                                        elif all_players:
                                            greatgrandchild.set(all_players[0])
        
        # Обновляем отображение информации
        self.display_player_info(current_player if current_player in all_players else (all_players[0] if all_players else ""))

    def display_player_info(self, username):
        """Отобразить информацию о выбранном игроке"""
        # Очищаем все вкладки
        for tab in [self.info_tab, self.inventory_tab, self.equipment_tab, self.management_tab]:
            for widget in tab.winfo_children():
                widget.destroy()
        
        if not username:
            # Если нет игрока
            empty_frame = tk.Frame(self.info_tab, bg="#F5F5F5", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="👤", font=("Arial", 40), 
                    bg="#F5F5F5", fg="#BCAAA4").pack(pady=10)
            tk.Label(empty_frame, text="Нет данных об игроке", font=("Arial", 14, "bold"), 
                    bg="#F5F5F5", fg="#795548").pack(pady=5)
            return
        
        # Получаем данные игрока
        player_data = self.db.get_player(username)
        if not player_data:
            # Игрок не найден
            empty_frame = tk.Frame(self.info_tab, bg="#F5F5F5", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="❌", font=("Arial", 40), 
                    bg="#F5F5F5", fg="#f44336").pack(pady=10)
            tk.Label(empty_frame, text=f"Игрок '{username}' не найден", font=("Arial", 14, "bold"), 
                    bg="#F5F5F5", fg="#795548").pack(pady=5)
            return
        
        # Получаем статистики игрока
        player_stats = self.db.get_player_stats(username)
        
        # === ВКЛАДКА ИНФОРМАЦИИ ===
        # Заголовок вкладки информации
        info_header = tk.Frame(self.info_tab, bg="#4CAF50", height=40)
        info_header.pack(fill="x", pady=(0, 10))
        
        tk.Label(info_header, text=f"👤 {username}", font=("Arial", 14, "bold"), 
                 bg="#4CAF50", fg="white").pack(pady=8)
        
        # Основная информация
        main_info_frame = tk.Frame(self.info_tab, bg="#E8F5E9", relief="ridge", bd=2, padx=15, pady=15)
        main_info_frame.pack(fill="x", padx=10, pady=5)
        
        # Статус блокировки
        is_banned = player_stats.get("is_banned", False)
        ban_reason = player_stats.get("ban_reason", "")
        status_color = "#f44336" if is_banned else "#4CAF50"
        status_text = "🔴 ЗАБЛОКИРОВАН" if is_banned else "🟢 АКТИВЕН"
        
        status_frame = tk.Frame(main_info_frame, bg=status_color, padx=10, pady=5)
        status_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(status_frame, text=status_text, font=("Arial", 12, "bold"), 
                 bg=status_color, fg="white").pack()
        
        if is_banned and ban_reason:
            tk.Label(status_frame, text=f"Причина: {ban_reason}", font=("Arial", 10), 
                     bg=status_color, fg="white").pack()
        
        # Основные данные
        data_frame = tk.Frame(main_info_frame, bg="#E8F5E9")
        data_frame.pack(fill="x")
        
        # Создаем сетку для данных
        row1 = tk.Frame(data_frame, bg="#E8F5E9")
        row1.pack(fill="x", pady=3)
        
        tk.Label(row1, text="🎭 Класс:", font=("Arial", 11, "bold"), 
                 bg="#E8F5E9", width=12, anchor="w").pack(side="left")
        tk.Label(row1, text=player_stats.get("class", "Неизвестно"), font=("Arial", 11), 
                 bg="#E8F5E9", fg="#2E7D32").pack(side="left")
        
        tk.Label(row1, text="👤 Пол:", font=("Arial", 11, "bold"), 
                 bg="#E8F5E9", width=12, anchor="w").pack(side="left", padx=(20, 0))
        tk.Label(row1, text=player_stats.get("gender", "Неизвестно"), font=("Arial", 11), 
                 bg="#E8F5E9").pack(side="left")
        
        row2 = tk.Frame(data_frame, bg="#E8F5E9")
        row2.pack(fill="x", pady=3)
        
        tk.Label(row2, text="📊 Уровень:", font=("Arial", 11, "bold"), 
                 bg="#E8F5E9", width=12, anchor="w").pack(side="left")
        current_level = player_stats.get("level", 1)
        current_exp = player_data.get("experience", 0)
        exp_for_next = self.calculate_exp_for_level(current_level)
        level_text = f"{current_level} (Опыт: {current_exp}/{exp_for_next})"
        tk.Label(row2, text=level_text, font=("Arial", 11), 
                 bg="#E8F5E9", fg="#D32F2F").pack(side="left")
        
        tk.Label(row2, text="💰 Золото:", font=("Arial", 11, "bold"), 
                 bg="#E8F5E9", width=12, anchor="w").pack(side="left", padx=(20, 0))
        tk.Label(row2, text=str(player_data.get("gold", 0)), font=("Arial", 11), 
                 bg="#E8F5E9", fg="#FF9800").pack(side="left")
        
        # Статистики здоровья и маны
        stats_frame = tk.Frame(main_info_frame, bg="#E8F5E9", pady=10)
        stats_frame.pack(fill="x")
        
        hp_frame = tk.Frame(stats_frame, bg="#FFEBEE", relief="groove", bd=1, padx=10, pady=5)
        hp_frame.pack(side="left", fill="both", expand=True, padx=2)
        
        tk.Label(hp_frame, text="❤️ ЗДОРОВЬЕ", font=("Arial", 10, "bold"), 
                 bg="#FFEBEE", fg="#D32F2F").pack()
        hp_current = player_data.get("hp", 0)
        hp_max = player_data.get("hp_max", 100)
        tk.Label(hp_frame, text=f"{hp_current}/{hp_max}", font=("Arial", 11, "bold"), 
                 bg="#FFEBEE", fg="#D32F2F").pack()
        
        mp_frame = tk.Frame(stats_frame, bg="#E3F2FD", relief="groove", bd=1, padx=10, pady=5)
        mp_frame.pack(side="left", fill="both", expand=True, padx=2)
        
        tk.Label(mp_frame, text="💙 МАНА", font=("Arial", 10, "bold"), 
                 bg="#E3F2FD", fg="#1976D2").pack()
        mp_current = player_data.get("mp", 0)
        mp_max = player_data.get("mp_max", 20)
        tk.Label(mp_frame, text=f"{mp_current}/{mp_max}", font=("Arial", 11, "bold"), 
                 bg="#E3F2FD", fg="#1976D2").pack()
        
        # Метаданные
        meta_frame = tk.Frame(main_info_frame, bg="#F5F5F5", relief="ridge", bd=1, padx=10, pady=10)
        meta_frame.pack(fill="x", pady=(10, 0))
        
        tk.Label(meta_frame, text="📅 МЕТАДАННЫЕ", font=("Arial", 10, "bold"), 
                 bg="#F5F5F5", fg="#757575").pack(anchor="w", pady=(0, 5))
        
        created = player_stats.get("created", "Неизвестно")
        last_login = player_stats.get("last_login", "Неизвестно")
        
        tk.Label(meta_frame, text=f"Создан: {created}", font=("Arial", 9), 
                 bg="#F5F5F5", fg="#757575").pack(anchor="w")
        tk.Label(meta_frame, text=f"Последний вход: {last_login}", font=("Arial", 9), 
                 bg="#F5F5F5", fg="#757575").pack(anchor="w")
        
        is_admin = player_stats.get("is_admin", False)
        admin_text = "👑 АДМИНИСТРАТОР" if is_admin else "👤 ОБЫЧНЫЙ ИГРОК"
        admin_color = "#FFD700" if is_admin else "#757575"
        
        tk.Label(meta_frame, text=admin_text, font=("Arial", 9, "bold"), 
                 bg=admin_color, fg="black").pack(anchor="w", pady=(5, 0))
        
        # === ВКЛАДКА ИНВЕНТАРЯ ===
        self.display_player_inventory_tab(username, player_data)
        
        # === ВКЛАДКА ЭКИПИРОВКИ ===
        self.display_player_equipment_tab(username, player_data)
        
        # === ВКЛАДКА УПРАВЛЕНИЯ ===
        self.display_player_management_tab(username, player_data, player_stats)

    def display_player_inventory_tab(self, username, player_data):
        """Отобразить вкладку инвентаря игрока"""
        # Заголовок
        inv_header = tk.Frame(self.inventory_tab, bg="#FF9800", height=40)
        inv_header.pack(fill="x", pady=(0, 10))
        
        tk.Label(inv_header, text=f"🎒 ИНВЕНТАРЬ: {username}", font=("Arial", 14, "bold"), 
                 bg="#FF9800", fg="white").pack(pady=8)
        
        # Основной контейнер с прокруткой
        inv_container = tk.Frame(self.inventory_tab, bg="#FFF3E0")
        inv_container.pack(fill="both", expand=True, padx=10, pady=5)
        
        canvas = tk.Canvas(inv_container, bg="#FFF3E0", highlightthickness=0)
        scrollbar = tk.Scrollbar(inv_container, orient="vertical", command=canvas.yview)
        scrollable = tk.Frame(canvas, bg="#FFF3E0")
        
        scrollable.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Получаем инвентарь игрока
        inventory = player_data.get("inventory", [])
        items_db = self.load_items()
        
        # Панель управления инвентарем
        control_frame = tk.Frame(scrollable, bg="#FFE0B2", relief="groove", bd=2, padx=10, pady=10)
        control_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(control_frame, text="⚡ УПРАВЛЕНИЕ ИНВЕНТАРЕМ", font=("Arial", 11, "bold"), 
                 bg="#FFE0B2", fg="#E65100").pack(anchor="w", pady=(0, 10))
        
        btn_frame = tk.Frame(control_frame, bg="#FFE0B2")
        btn_frame.pack(fill="x")
        
        tk.Button(btn_frame, text="➕ Добавить предмет", font=("Arial", 10, "bold"),
                 bg="#4CAF50", fg="white", width=20,
                 command=lambda: self.add_item_to_player_inventory(username)).pack(side="left", padx=2)
        
        tk.Button(btn_frame, text="🗑 Очистить инвентарь", font=("Arial", 10, "bold"),
                 bg="#f44336", fg="white", width=20,
                 command=lambda: self.clear_player_inventory(username)).pack(side="left", padx=2)
        
        # Отображаем предметы
        if not inventory:
            empty_frame = tk.Frame(scrollable, bg="#FFF3E0", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="📭", font=("Arial", 40), 
                    bg="#FFF3E0", fg="#BCAAA4").pack(pady=10)
            tk.Label(empty_frame, text="Инвентарь пуст", font=("Arial", 14, "bold"), 
                    bg="#FFF3E0", fg="#795548").pack(pady=5)
        else:
            # Вычисляем вес
            total_weight = self.calculate_weight(inventory)
            
            weight_frame = tk.Frame(scrollable, bg="#FFECB3", padx=10, pady=5)
            weight_frame.pack(fill="x", pady=(0, 10))
            
            tk.Label(weight_frame, text=f"⚖️ Общий вес: {total_weight:.1f}/10.0 кг", 
                    font=("Arial", 10, "bold"), bg="#FFECB3", fg="#5D4037").pack()
            
            # Отображаем предметы
            row_frame = None
            items_per_row = 2
            
            for i, item in enumerate(inventory):
                if i % items_per_row == 0:
                    row_frame = tk.Frame(scrollable, bg="#FFF3E0")
                    row_frame.pack(fill="x", pady=5, padx=5)
                
                # Определяем данные предмета
                if isinstance(item, dict):
                    # Это объект предмета из лута
                    item_data = item
                    item_id = item_data.get("id", f"loot_item_{i}")
                else:
                    # Это ID предмета
                    item_id = item
                    item_data = items_db.get(item_id, {"name": item_id, "icon": "📦", "weight": 0.0})
                
                # Создаем карточку предмета
                card = tk.Frame(row_frame, bg="white", relief="raised", bd=2)
                card.pack(side="left", fill="both", expand=True, padx=5, ipady=5)
                
                top_frame = tk.Frame(card, bg="white")
                top_frame.pack(fill="x", pady=(8, 5))
                
                tk.Label(top_frame, text=item_data.get("icon", "📦"), font=("Arial", 20), 
                        bg="white").pack(side="left", padx=(10, 5))
                
                info_frame = tk.Frame(top_frame, bg="white")
                info_frame.pack(side="left", fill="x", expand=True)
                
                # Название предмета
                item_name = item_data.get("name", "Предмет")
                if len(item_name) > 15:
                    item_name = item_name[:15] + "..."
                
                tk.Label(info_frame, text=item_name, font=("Arial", 10, "bold"), 
                        bg="white", anchor="w").pack(fill="x", padx=(0, 10))
                
                tk.Label(info_frame, text=f"⚖️ {item_data.get('weight', 0):.1f} кг", 
                        font=("Arial", 9), bg="white", fg="#795548", anchor="w").pack(fill="x", padx=(0, 10))
                
                # Для предметов из лута показываем редкость
                if isinstance(item, dict) and "rarity" in item_data:
                    rarity_frame = tk.Frame(info_frame, bg="white")
                    rarity_frame.pack(fill="x", padx=(0, 10), pady=(2, 0))
                    
                    rarity = item_data.get("rarity", "Обычный")
                    rarity_colors = {
                        "Обычный": "#757575",
                        "Необычный": "#4CAF50",
                        "Редкий": "#2196F3",
                        "Эпический": "#9C27B0",
                        "Легендарный": "#FF9800"
                    }
                    rarity_color = rarity_colors.get(rarity, "#757575")
                    
                    tk.Label(rarity_frame, text=f"★ {rarity}", font=("Arial", 8, "bold"),
                            bg=rarity_color, fg="white", padx=3, pady=1).pack(side="left")
                
                # Кнопка удаления
                action_btn = tk.Button(card, text="🗑 Удалить", font=("Arial", 9, "bold"),
                                     bg="#f44336", fg="white", width=12,
                                     command=lambda iid=item_id, uname=username: 
                                     self.remove_item_from_player_inventory(uname, iid))
                action_btn.pack(pady=5)

    def display_player_equipment_tab(self, username, player_data):
        """Отобразить вкладку экипировки игрока"""
        # Заголовок
        eq_header = tk.Frame(self.equipment_tab, bg="#7B1FA2", height=40)
        eq_header.pack(fill="x", pady=(0, 10))
        
        tk.Label(eq_header, text=f"🎽 ЭКИПИРОВКА: {username}", font=("Arial", 14, "bold"), 
                 bg="#7B1FA2", fg="white").pack(pady=8)
        
        # Основной контейнер
        eq_container = tk.Frame(self.equipment_tab, bg="#F5F5F5")
        eq_container.pack(fill="both", expand=True, padx=10, pady=5)
        
        # Получаем экипировку
        equipped = player_data.get("equipped", {})
        items_db = self.load_items()
        
        # Создаем сетку для слотов экипировки
        slots_frame = tk.Frame(eq_container, bg="#F5F5F5")
        slots_frame.pack(fill="both", expand=True)
        
        slots = [
            ("head", "Голова", "👑", 0, 0),
            ("body", "Тело", "👕", 1, 0),
            ("hands", "Руки", "🧤", 0, 1),
            ("feet", "Ноги", "👢", 1, 1),
            ("weapon", "Оружие", "⚔️", 0, 2)
        ]
        
        for slot_key, slot_name, slot_icon, row, col in slots:
            slot_frame = tk.Frame(slots_frame, bg="white", relief="groove", bd=2, width=150, height=150)
            slot_frame.grid(row=row, column=col, padx=5, pady=5, sticky="nsew")
            slot_frame.grid_propagate(False)
            
            slot_header = tk.Frame(slot_frame, bg="#7E57C2", height=25)
            slot_header.pack(fill="x")
            tk.Label(slot_header, text=f"{slot_icon} {slot_name}", 
                    font=("Arial", 10, "bold"), bg="#7E57C2", fg="white").pack(pady=2)
            
            slot_content = tk.Frame(slot_frame, bg="white", padx=10, pady=10)
            slot_content.pack(fill="both", expand=True)
            
            equipped_item = equipped.get(slot_key)
            if equipped_item:
                if isinstance(equipped_item, dict):
                    item = equipped_item
                else:
                    item = items_db.get(equipped_item, {})
                
                if item:
                    tk.Label(slot_content, text=item.get("icon", "📦"), 
                            font=("Arial", 24), bg="white").pack(pady=(0, 5))
                    
                    item_name = item.get("name", "Предмет")
                    if len(item_name) > 10:
                        item_name = item_name[:10] + "..."
                    
                    tk.Label(slot_content, text=item_name, 
                            font=("Arial", 9, "bold"), bg="white", wraplength=100).pack()
                    
                    if slot_key == "weapon":
                        damage = item.get('damage', 0)
                        tk.Label(slot_content, text=f"⚔️ {damage} урона", 
                                font=("Arial", 8), bg="white", fg="#C62828").pack()
                    else:
                        defense = item.get('defense', 0)
                        tk.Label(slot_content, text=f"🛡️ {defense} защита", 
                                font=("Arial", 8), bg="white", fg="#2E7D32").pack()
                    
                    tk.Button(slot_content, text="🔽 Снять", font=("Arial", 8),
                             bg="#f44336", fg="white", width=10,
                             command=lambda s=slot_key, uname=username: 
                             self.unequip_item_from_player(uname, s)).pack(pady=(5, 0))
                else:
                    tk.Label(slot_content, text="┄", font=("Arial", 24), 
                            bg="white", fg="#BDBDBD").pack(pady=(10, 5))
                    tk.Label(slot_content, text="Пусто", font=("Arial", 9), 
                            bg="white", fg="#757575").pack()
        else:
            tk.Label(slot_content, text="┄", font=("Arial", 24), 
                    bg="white", fg="#BDBDBD").pack(pady=(10, 5))
            tk.Label(slot_content, text="Пусто", font=("Arial", 9), 
                    bg="white", fg="#757575").pack()
    
        # Кнопка управления всей экипировкой
        manage_frame = tk.Frame(eq_container, bg="#F5F5F5", pady=15)
        manage_frame.pack(fill="x", side="bottom", pady=(15, 0))
        
        tk.Button(manage_frame, text="🗑 Снять всю экипировку", font=("Arial", 10, "bold"),
                 bg="#f44336", fg="white", width=25,
                 command=lambda: self.unequip_all_from_player(username)).pack(pady=5)

    def display_player_management_tab(self, username, player_data, player_stats):
        """Отобразить вкладку управления игроком"""
        # Заголовок
        mgmt_header = tk.Frame(self.management_tab, bg="#D32F2F", height=40)
        mgmt_header.pack(fill="x", pady=(0, 10))
        
        tk.Label(mgmt_header, text=f"⚙️ УПРАВЛЕНИЕ: {username}", font=("Arial", 14, "bold"), 
                 bg="#D32F2F", fg="white").pack(pady=8)
        
        # Предупреждение
        warning_frame = tk.Frame(self.management_tab, bg="#FFEBEE", relief="ridge", bd=2, padx=15, pady=15)
        warning_frame.pack(fill="x", padx=10, pady=(0, 15))
        
        tk.Label(warning_frame, text="⚠️ ВНИМАНИЕ: АДМИНИСТРАТИВНЫЕ ДЕЙСТВИЯ", 
                 font=("Arial", 11, "bold"), bg="#FFEBEE", fg="#D32F2F").pack(anchor="w", pady=(0, 5))
        
        tk.Label(warning_frame, text="Эти действия могут существенно повлиять на игровой процесс.", 
                 font=("Arial", 9), bg="#FFEBEE", fg="#C62828").pack(anchor="w")
        tk.Label(warning_frame, text="Будьте осторожны при использовании этих функций.", 
                 font=("Arial", 9), bg="#FFEBEE", fg="#C62828").pack(anchor="w")
        
        # Проверяем, не пытаемся ли редактировать себя
        is_self = username == self.player_data.get("username")
        
        # Секция блокировки/разблокировки
        ban_frame = tk.Frame(self.management_tab, bg="#FFF3E0", relief="ridge", bd=2, padx=15, pady=15)
        ban_frame.pack(fill="x", padx=10, pady=5)
        
        tk.Label(ban_frame, text="🔒 УПРАВЛЕНИЕ БЛОКИРОВКОЙ", font=("Arial", 11, "bold"), 
                 bg="#FFF3E0", fg="#E65100").pack(anchor="w", pady=(0, 10))
        
        is_banned = player_stats.get("is_banned", False)
        ban_reason = player_stats.get("ban_reason", "")
        
        if is_banned:
            tk.Label(ban_frame, text="Статус: 🔴 ЗАБЛОКИРОВАН", font=("Arial", 10, "bold"), 
                     bg="#FFF3E0", fg="#D32F2F").pack(anchor="w", pady=(0, 5))
            if ban_reason:
                tk.Label(ban_frame, text=f"Причина: {ban_reason}", font=("Arial", 9), 
                         bg="#FFF3E0", fg="#795548").pack(anchor="w")
            
            btn_frame = tk.Frame(ban_frame, bg="#FFF3E0")
            btn_frame.pack(fill="x", pady=10)
            
            if not is_self:
                tk.Button(btn_frame, text="🔓 Разблокировать игрока", font=("Arial", 10, "bold"),
                         bg="#4CAF50", fg="white", width=25,
                         command=lambda: self.unban_player_action(username)).pack()
            else:
                tk.Label(btn_frame, text="Нельзя разблокировать себя", font=("Arial", 9), 
                         bg="#FFF3E0", fg="#757575").pack()
        else:
            tk.Label(ban_frame, text="Статус: 🟢 АКТИВЕН", font=("Arial", 10, "bold"), 
                     bg="#FFF3E0", fg="#388E3C").pack(anchor="w", pady=(0, 5))
            
            btn_frame = tk.Frame(ban_frame, bg="#FFF3E0")
            btn_frame.pack(fill="x", pady=10)
            
            if not is_self:
                tk.Button(btn_frame, text="🔒 Заблокировать игрока", font=("Arial", 10, "bold"),
                         bg="#f44336", fg="white", width=25,
                         command=lambda: self.ban_player_dialog(username)).pack()
            else:
                tk.Label(btn_frame, text="Нельзя заблокировать себя", font=("Arial", 9), 
                         bg="#FFF3E0", fg="#757575").pack()
        
        # Секция редактирования характеристик
        stats_frame = tk.Frame(self.management_tab, bg="#E3F2FD", relief="ridge", bd=2, padx=15, pady=15)
        stats_frame.pack(fill="x", padx=10, pady=10)
        
        tk.Label(stats_frame, text="📊 РЕДАКТИРОВАНИЕ ХАРАКТЕРИСТИК", font=("Arial", 11, "bold"), 
                 bg="#E3F2FD", fg="#1565C0").pack(anchor="w", pady=(0, 10))
        
        # Поля для редактирования характеристик
        hp_var = tk.IntVar(value=player_data.get("hp", 100))
        hp_max_var = tk.IntVar(value=player_data.get("hp_max", 100))
        mp_var = tk.IntVar(value=player_data.get("mp", 20))
        mp_max_var = tk.IntVar(value=player_data.get("mp_max", 20))
        level_var = tk.IntVar(value=player_data.get("level", 1))
        gold_var = tk.IntVar(value=player_data.get("gold", 100))
        
        fields = [
            ("❤️ Здоровье:", hp_var, hp_max_var),
            ("💙 Мана:", mp_var, mp_max_var),
            ("📊 Уровень:", level_var, None),
            ("💰 Золото:", gold_var, None)
        ]
        
        for label, var1, var2 in fields:
            field_frame = tk.Frame(stats_frame, bg="#E3F2FD")
            field_frame.pack(fill="x", pady=3)
            
            tk.Label(field_frame, text=label, bg="#E3F2FD", width=15, anchor="w").pack(side="left")
            
            if var2:
                # Для здоровья и маны - текущее/максимальное
                tk.Spinbox(field_frame, from_=1, to=999, textvariable=var1, width=8).pack(side="left", padx=2)
                tk.Label(field_frame, text="/", bg="#E3F2FD").pack(side="left")
                tk.Spinbox(field_frame, from_=1, to=999, textvariable=var2, width=8).pack(side="left", padx=2)
            else:
                # Для уровня и золота - просто значение
                tk.Spinbox(field_frame, from_=1, to=999, textvariable=var1, width=10).pack(side="left")
        
        tk.Button(stats_frame, text="💾 Сохранить характеристики", font=("Arial", 10, "bold"),
                 bg="#2196F3", fg="white", width=25,
                 command=lambda: self.save_player_stats(username, hp_var.get(), hp_max_var.get(), 
                                                       mp_var.get(), mp_max_var.get(), 
                                                       level_var.get(), gold_var.get())).pack(pady=10)
        
        # Опасные действия
        danger_frame = tk.Frame(self.management_tab, bg="#FFCDD2", relief="ridge", bd=2, padx=15, pady=15)
        danger_frame.pack(fill="x", padx=10, pady=10)
        
        tk.Label(danger_frame, text="☠️ ОПАСНЫЕ ДЕЙСТВИЯ", font=("Arial", 11, "bold"), 
                 bg="#FFCDD2", fg="#C62828").pack(anchor="w", pady=(0, 10))
        
        danger_text = "Эти действия невозможно отменить. Используйте с осторожностью!"
        tk.Label(danger_frame, text=danger_text, font=("Arial", 9), 
                 bg="#FFCDD2", fg="#C62828").pack(anchor="w", pady=(0, 10))
        
        danger_btn_frame = tk.Frame(danger_frame, bg="#FFCDD2")
        danger_btn_frame.pack(fill="x", pady=5)
        
        if not is_self:
            tk.Button(danger_btn_frame, text="🗑 Удалить игрока", font=("Arial", 10, "bold"),
                     bg="#B71C1C", fg="white", width=20,
                     command=lambda: self.delete_player_action(username)).pack(side="left", padx=2)
            
            tk.Button(danger_btn_frame, text="🔄 Сбросить прогресс", font=("Arial", 10, "bold"),
                     bg="#FF5722", fg="white", width=20,
                     command=lambda: self.reset_player_progress(username)).pack(side="left", padx=2)
        else:
            tk.Label(danger_btn_frame, text="Нельзя применять к себе", font=("Arial", 9), 
                     bg="#FFCDD2", fg="#757575").pack()

    # ================ МЕТОДЫ ДЛЯ РАБОТЫ С ИНВЕНТАРЕМ ИГРОКА ================
    def add_item_to_player_inventory(self, username):
        """Добавить предмет в инвентарь игрока"""
        dialog = tk.Toplevel(self.root)
        dialog.title(f"➕ Добавить предмет игроку: {username}")
        dialog.geometry("600x500")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#5E35B1", height=50)
        header_frame.pack(fill="x")
        tk.Label(header_frame, text=f"➕ ДОБАВЛЕНИЕ ПРЕДМЕТА: {username}", 
                 font=("Arial", 12, "bold"), bg="#5E35B1", fg="white").pack(pady=10)
        
        # Поисковая строка
        search_frame = tk.Frame(dialog, bg="#F5F5F5", padx=10, pady=10)
        search_frame.pack(fill="x")
        
        tk.Label(search_frame, text="Поиск:", bg="#F5F5F5").pack(side="left", padx=(0, 5))
        search_var = tk.StringVar()
        search_entry = tk.Entry(search_frame, textvariable=search_var, width=40)
        search_entry.pack(side="left", padx=5)
        search_entry.focus()
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#F5F5F5")
        main_container.pack(fill="both", expand=True, padx=10, pady=5)
        
        canvas = tk.Canvas(main_container, bg="#F5F5F5", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#F5F5F5")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        items = self.load_items()
        all_items = list(items.keys())
        
        def filter_items():
            """Фильтрация и отображение предметов"""
            for widget in scrollable_frame.winfo_children():
                widget.destroy()
            
            search_text = search_var.get().lower()
            
            filtered_items = []
            for item_id in all_items:
                item = items[item_id]
                matches_search = (search_text in item_id.lower() or 
                                 search_text in item.get("name", "").lower())
                
                if matches_search:
                    filtered_items.append((item_id, item))
            
            if not filtered_items:
                tk.Label(scrollable_frame, text="❌ Предметы не найдены", 
                        font=("Arial", 12), bg="#F5F5F5", fg="#757575").pack(pady=50)
                return
            
            for item_id, item in filtered_items:
                # Карточка предмета
                card = tk.Frame(scrollable_frame, bg="white", relief="raised", bd=1, padx=10, pady=10)
                card.pack(fill="x", pady=5)
                
                # Левая часть - информация
                left_frame = tk.Frame(card, bg="white")
                left_frame.pack(side="left", fill="both", expand=True)
                
                top_frame = tk.Frame(left_frame, bg="white")
                top_frame.pack(fill="x")
                
                tk.Label(top_frame, text=item.get("icon", "📦"), font=("Arial", 20), 
                        bg="white").pack(side="left", padx=(0, 10))
                
                name_frame = tk.Frame(top_frame, bg="white")
                name_frame.pack(side="left", fill="both", expand=True)
                
                tk.Label(name_frame, text=item["name"], font=("Arial", 11, "bold"), 
                        bg="white").pack(anchor="w")
                tk.Label(name_frame, text=f"ID: {item_id}", font=("Arial", 9), 
                        bg="white", fg="#757575").pack(anchor="w")
                
                # Статистики
                stats_frame = tk.Frame(left_frame, bg="white")
                stats_frame.pack(fill="x", pady=(5, 0))
                
                if item.get("type") == "weapon":
                    tk.Label(stats_frame, text=f"⚔️ Урон: {item.get('damage', 0)}", 
                            font=("Arial", 9), bg="white", fg="#D32F2F").pack(side="left", padx=(0, 10))
                elif item.get("type") == "armor":
                    tk.Label(stats_frame, text=f"🛡️ Защита: {item.get('defense', 0)}", 
                            font=("Arial", 9), bg="white", fg="#388E3C").pack(side="left", padx=(0, 10))
                
                tk.Label(stats_frame, text=f"⚖️ {item.get('weight', 0):.1f} кг", 
                        font=("Arial", 9), bg="white", fg="#795548").pack(side="left")
                
                # Правая часть - кнопка добавления
                btn_frame = tk.Frame(card, bg="white")
                btn_frame.pack(side="right")
                
                tk.Button(btn_frame, text="➕ Добавить", font=("Arial", 9, "bold"),
                         bg="#4CAF50", fg="white", width=12,
                         command=lambda iid=item_id: self.add_item_to_player(username, iid, dialog)).pack(pady=2)
    
        # Привязываем события поиска
        search_var.trace("w", lambda *args: filter_items())
        
        # Инициализация списка
        filter_items()
        
        # Кнопка закрытия
        tk.Button(dialog, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=dialog.destroy).pack(pady=10)

    def add_item_to_player(self, username, item_id, dialog):
        """Добавить конкретный предмет игроку"""
        player_data = self.db.get_player(username)
        if not player_data:
            messagebox.showerror("Ошибка", f"Игрок {username} не найден!", parent=dialog)
            return
        
        items_db = self.load_items()
        item = items_db.get(item_id, {})
        
        if not item:
            messagebox.showerror("Ошибка", f"Предмет {item_id} не найден!", parent=dialog)
            return
        
        # Проверяем вес
        weight = item.get("weight", 0)
        current_weight = self.calculate_weight(player_data.get("inventory", []))
        
        if current_weight + weight > 10.0:
            messagebox.showwarning("⚠️", "Инвентарь игрока переполнен!", parent=dialog)
            return
        
        # Добавляем предмет
        if "inventory" not in player_data:
            player_data["inventory"] = []
        
        player_data["inventory"].append(item_id)
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Предмет '{item.get('name', item_id)}' добавлен игроку {username}!", parent=dialog)
        dialog.destroy()
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

    def remove_item_from_player_inventory(self, username, item_id):
        """Удалить предмет из инвентаря игрока"""
        player_data = self.db.get_player(username)
        if not player_data:
            return
        
        inventory = player_data.get("inventory", [])
        
        # Ищем предмет для удаления
        new_inventory = []
        item_removed = False
        
        for item in inventory:
            if isinstance(item, dict):
                # Это объект предмета из лута
                if item.get("id") != item_id:
                    new_inventory.append(item)
                else:
                    item_removed = True
            else:
                # Это ID предмета
                if item != item_id:
                    new_inventory.append(item)
                else:
                    item_removed = True
        
        if not item_removed:
            messagebox.showinfo("Информация", "Предмет не найден в инвентаре игрока.")
            return
        
        # Обновляем инвентарь
        player_data["inventory"] = new_inventory
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Предмет удален из инвентаря игрока {username}!")
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

    def clear_player_inventory(self, username):
        """Очистить весь инвентарь игрока"""
        if not messagebox.askyesno("⚠️ Подтверждение", 
                                  f"Вы уверены, что хотите очистить весь инвентарь игрока {username}?"):
            return
        
        player_data = self.db.get_player(username)
        if not player_data:
            return
        
        # Очищаем инвентарь
        player_data["inventory"] = []
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Инвентарь игрока {username} очищен!")
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

    # ================ МЕТОДЫ ДЛЯ РАБОТЫ С ЭКИПИРОВКОЙ ИГРОКА ================
    def unequip_item_from_player(self, username, slot):
        """Снять предмет с игрока"""
        player_data = self.db.get_player(username)
        if not player_data:
            return
        
        equipped = player_data.get("equipped", {})
        
        if slot not in equipped:
            messagebox.showinfo("Информация", f"В слоте {slot} ничего не экипировано.")
            return
        
        # Получаем предмет
        item = equipped[slot]
        
        # Проверяем вес инвентаря
        items_db = self.load_items()
        
        if isinstance(item, dict):
            # Это объект предмета из лута
            item_weight = item.get("weight", 0)
        else:
            # Это ID предмета
            item_data = items_db.get(item, {})
            item_weight = item_data.get("weight", 0)
        
        current_weight = self.calculate_weight(player_data.get("inventory", []))
        
        if current_weight + item_weight > 10.0:
            messagebox.showwarning("⚠️", "Инвентарь игрока переполнен! Нельзя снять предмет.")
            return
        
        # Добавляем предмет в инвентарь
        if "inventory" not in player_data:
            player_data["inventory"] = []
        
        player_data["inventory"].append(item)
        
        # Удаляем из экипировки
        del equipped[slot]
        player_data["equipped"] = equipped
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Предмет снят с игрока {username}!")
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

    def unequip_all_from_player(self, username):
        """Снять всю экипировку с игрока"""
        if not messagebox.askyesno("⚠️ Подтверждение", 
                                  f"Вы уверены, что хотите снять всю экипировку с игрока {username}?"):
            return
        
        player_data = self.db.get_player(username)
        if not player_data:
            return
        
        equipped = player_data.get("equipped", {})
        items_db = self.load_items()
        
        # Проверяем общий вес
        total_weight = 0
        for slot, item in equipped.items():
            if isinstance(item, dict):
                total_weight += item.get("weight", 0)
            else:
                item_data = items_db.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        current_weight = self.calculate_weight(player_data.get("inventory", []))
        
        if current_weight + total_weight > 10.0:
            messagebox.showwarning("⚠️", "Инвентарь игрока не вместит все предметы!")
            return
        
        # Переносим все предметы в инвентарь
        if "inventory" not in player_data:
            player_data["inventory"] = []
        
        for slot, item in equipped.items():
            player_data["inventory"].append(item)
        
        # Очищаем экипировку
        player_data["equipped"] = {}
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Вся экипировка снята с игрока {username}!")
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

    # ================ МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ ИГРОКОМ ================
    def ban_player_dialog(self, username):
        """Диалог блокировки игрока"""
        dialog = tk.Toplevel(self.root)
        dialog.title(f"🔒 Блокировка игрока: {username}")
        dialog.geometry("400x300")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        tk.Label(dialog, text=f"🔒 БЛОКИРОВКА ИГРОКА: {username}", 
                 font=("Arial", 12, "bold"), bg="#F5F5F5", fg="#D32F2F").pack(pady=(10, 20))
        
        tk.Label(dialog, text="Причина блокировки:", bg="#F5F5F5").pack(anchor="w", padx=20, pady=(0, 5))
        
        reason_var = tk.StringVar()
        reason_text = tk.Text(dialog, height=6, width=40)
        reason_text.pack(padx=20, pady=5)
        reason_text.insert("1.0", "Нарушение правил игры")
        
        def ban_player():
            reason = reason_text.get("1.0", "end-1c").strip()
            if not reason:
                reason = "Нарушение правил игры"
            
            # Блокируем игрока
            if self.db.ban_player(username, reason):
                messagebox.showinfo("✅", f"Игрок {username} заблокирован!\nПричина: {reason}", parent=dialog)
                dialog.destroy()
                
                # Обновляем отображение
                if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
                    self.display_player_info(username)
            else:
                messagebox.showerror("❌ Ошибка", f"Не удалось заблокировать игрока {username}", parent=dialog)
        
        tk.Button(dialog, text="🔒 Заблокировать игрока", bg="#f44336", fg="white",
                 font=("Arial", 10, "bold"), command=ban_player).pack(pady=10)
        
        tk.Button(dialog, text="❌ Отмена", bg="#757575", fg="white",
                 command=dialog.destroy).pack(pady=5)

    def unban_player_action(self, username):
        """Разблокировать игрока"""
        if not messagebox.askyesno("🔓 Разблокировка", 
                                  f"Вы уверены, что хотите разблокировать игрока {username}?"):
            return
        
        if self.db.unban_player(username):
            messagebox.showinfo("✅", f"Игрок {username} разблокирован!")
            
            # Обновляем отображение
            if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
                self.display_player_info(username)
        else:
            messagebox.showerror("❌ Ошибка", f"Не удалось разблокировать игрока {username}")

    def save_player_stats(self, username, hp, hp_max, mp, mp_max, level, gold):
        """Сохранить характеристики игрока"""
        player_data = self.db.get_player(username)
        if not player_data:
            return
        
        # Обновляем характеристики
        player_data["hp"] = min(hp, hp_max)
        player_data["hp_max"] = hp_max
        player_data["mp"] = min(mp, mp_max)
        player_data["mp_max"] = mp_max
        player_data["level"] = level
        player_data["gold"] = gold
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Характеристики игрока {username} обновлены!")
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

    def delete_player_action(self, username):
        """Удалить игрока"""
        if not messagebox.askyesno("☠️ Удаление игрока", 
                                  f"ВЫ УВЕРЕНЫ, ЧТО ХОТИТЕ УДАЛИТЬ ИГРОКА {username}?\n\n"
                                  "Это действие невозможно отменить!\n"
                                  "Все данные игрока будут безвозвратно удалены."):
            return
        
        if self.db.delete_player(username):
            messagebox.showinfo("✅", f"Игрок {username} удален!")
            
            # Обновляем отображение
            if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
                # Показываем список игроков заново
                all_players = self.db.get_all_players()
                if all_players:
                    self.display_player_info(all_players[0])
                else:
                    # Очищаем все вкладки
                    for tab in [self.info_tab, self.inventory_tab, self.equipment_tab, self.management_tab]:
                        for widget in tab.winfo_children():
                            widget.destroy()
                    
                    empty_frame = tk.Frame(self.info_tab, bg="#F5F5F5", height=150)
                    empty_frame.pack(fill="both", expand=True, pady=30)
                    
                    tk.Label(empty_frame, text="👤", font=("Arial", 40), 
                            bg="#F5F5F5", fg="#BCAAA4").pack(pady=10)
                    tk.Label(empty_frame, text="Нет игроков в базе", font=("Arial", 14, "bold"), 
                            bg="#F5F5F5", fg="#795548").pack(pady=5)
        else:
            messagebox.showerror("❌ Ошибка", f"Не удалось удалить игрока {username}")

    def reset_player_progress(self, username):
        """Сбросить прогресс игрока"""
        if not messagebox.askyesno("🔄 Сброс прогресса", 
                                  f"Вы уверены, что хотите сбросить прогресс игрока {username}?\n\n"
                                  "Это действие:\n"
                                  "1. Очистит весь инвентарь\n"
                                  "2. Снимет всю экипировку\n"
                                  "3. Сбросит уровень на 1\n"
                                  "4. Сбросит золото на 100\n"
                                  "5. Восстановит здоровье и ману\n\n"
                                  "Данные блокировки сохранятся."):
            return
        
        player_data = self.db.get_player(username)
        if not player_data:
            return
        
        # Сбрасываем прогресс
        player_class = player_data.get("class", "Воин")
        
        # Устанавливаем характеристики в зависимости от класса
        if player_class == "Воин":
            hp, mp = 150, 10
        elif player_class == "Маг":
            hp, mp = 75, 40
        elif player_class == "Охотник":
            hp, mp = 100, 20
        else:
            hp, mp = 100, 20
        
        # Базовая экипировка в зависимости от класса
        base_items = {
            "Воин": ["wooden_sword", "shirt"],
            "Маг": ["wizard_staff", "shirt"],
            "Охотник": ["hunting_bow", "shirt"]
        }
        
        # Обновляем данные
        player_data.update({
            "hp": hp,
            "hp_max": hp,
            "mp": mp,
            "mp_max": mp,
            "inventory": base_items.get(player_class, []),
            "equipped": {},
            "level": 1,
            "gold": 100,
            "experience": 0
        })
        
        # Сохраняем изменения
        self.db.update_player(username, player_data)
        
        messagebox.showinfo("✅", f"Прогресс игрока {username} сброшен!")
        
        # Обновляем отображение
        if hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists():
            self.display_player_info(username)

                # ================ ИНФОРМАЦИЯ О ЛУТЕ МОНСТРА ================
    def show_monster_loot_info(self, monster, location):
        """Показать информацию о луте монстра"""
        dialog = tk.Toplevel(self.root)
        dialog.title(f"📦 Лут монстра: {monster.name}")
        dialog.geometry("500x400")
        dialog.configure(bg="#5D4037")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#3E2723", height=50)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text=f"📦 ЛУТ МОНСТРА: {monster.name}", 
                font=("Arial", 14, "bold"), bg="#3E2723", fg="white").pack(pady=10)
        
        # Информация о монстре
        info_frame = tk.Frame(dialog, bg="#6D4C41", padx=10, pady=5)
        info_frame.pack(fill="x", padx=10, pady=5)
        
        tk.Label(info_frame, text=f"Монстр: {monster.icon} {monster.name}", 
                font=("Arial", 10, "bold"), bg="#6D4C41", fg="white").pack(side="left")
        
        # === ДОБАВЬТЕ ОТОБРАЖЕНИЕ ОПЫТА ===
        tk.Label(info_frame, text=f" | Опыт: {monster.exp_reward}", 
                font=("Arial", 10, "bold"), bg="#6D4C41", fg="#FFD54F").pack(side="left", padx=(10, 0))
        
        tk.Label(info_frame, text=f"Предметов в луте: {len(monster.loot_table)}", 
                font=("Arial", 10, "bold"), bg="#6D4C41", fg="#FFD54F").pack(side="right")
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#5D4037")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#5D4037", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#5D4037")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        items = self.load_static_items()
        
        if not monster.loot_table:
            empty_frame = tk.Frame(scrollable_frame, bg="#5D4037", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="📭", font=("Arial", 40), 
                    bg="#5D4037", fg="#A1887F").pack(pady=10)
            tk.Label(empty_frame, text="У монстра нет лута", font=("Arial", 14, "bold"), 
                    bg="#5D4037", fg="white").pack(pady=5)
            tk.Label(empty_frame, text="Администратор может настроить лут в редакторе", 
                    font=("Arial", 9), bg="#5D4037", fg="#BCAAA4").pack()
        else:
            for loot_item in monster.loot_table:
                base_item = items.get(loot_item.base_item_id, {})
                
                # Карточка предмета лута
                loot_card = tk.Frame(scrollable_frame, bg="#8D6E63", relief="raised", bd=2, padx=10, pady=10)
                loot_card.pack(fill="x", pady=5)
                
                # Информация о предмете
                info_frame = tk.Frame(loot_card, bg="#8D6E63")
                info_frame.pack(fill="both", expand=True)
                
                # Название
                item_name = f"{loot_item.name_prefix} {base_item.get('name', 'Предмет')}".strip()
                tk.Label(info_frame, text=item_name, font=("Arial", 11, "bold"), 
                        bg="#8D6E63", fg="white").pack(anchor="w")
                
                # Детали
                details_frame = tk.Frame(info_frame, bg="#8D6E63")
                details_frame.pack(fill="x", pady=2)
                
                # Редкость
                rarity_colors = {
                    "Обычный": "#757575",
                    "Необычный": "#4CAF50",
                    "Редкий": "#2196F3",
                    "Эпический": "#9C27B0",
                    "Легендарный": "#FF9800"
                }
                rarity_color = rarity_colors.get(loot_item.rarity, "#757575")
                
                tk.Label(details_frame, text=f"★ {loot_item.rarity}", font=("Arial", 9, "bold"),
                        bg=rarity_color, fg="white", padx=5, pady=1).pack(side="left", padx=(0, 10))
                
                # Шанс выпадения
                tk.Label(details_frame, text=f"Шанс: {loot_item.drop_chance}%", 
                        font=("Arial", 9), bg="#8D6E63", fg="#FFECB3").pack(side="left", padx=(0, 10))
                
                # Характеристики
                stats_frame = tk.Frame(info_frame, bg="#8D6E63")
                stats_frame.pack(fill="x", pady=(5, 0))
                
                if base_item.get("type") == "weapon":
                    tk.Label(stats_frame, text=f"⚔️ Урон: {loot_item.damage_range[0]}-{loot_item.damage_range[1]}", 
                            font=("Arial", 9), bg="#8D6E63", fg="#FFCDD2").pack(side="left", padx=(0, 10))
                elif base_item.get("type") == "armor":
                    tk.Label(stats_frame, text=f"🛡️ Защита: {loot_item.defense_range[0]}-{loot_item.defense_range[1]}", 
                            font=("Arial", 9), bg="#8D6E63", fg="#C8E6C9").pack(side="left", padx=(0, 10))
                
                tk.Label(stats_frame, text=f"⚖️ Вес: {loot_item.weight_range[0]:.1f}-{loot_item.weight_range[1]:.1f}", 
                        font=("Arial", 9), bg="#8D6E63", fg="#FFECB3").pack(side="left")
        
        # Кнопка закрытия
        tk.Button(dialog, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=dialog.destroy).pack(pady=10)
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')

    # ================ УМЕНИЯ В БОЮ ================
    def show_battle_abilities(self):
        """Показать умения в бою (исправленная версия)"""
        if not self.battle_active or self.player_acted_this_turn:
            return
        
        # Проверяем, не открыто ли уже окно
        for widget in self.root.winfo_children():
            if isinstance(widget, tk.Toplevel) and "Умения в бою" in widget.title():
                widget.lift()
                return
        
        dialog = tk.Toplevel(self.root)
        dialog.title("✨ Умения в бою")
        dialog.geometry("500x450")
        dialog.configure(bg="#2C2C2C")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Обработчик закрытия окна
        def on_closing():
            try:
                if dialog and dialog.winfo_exists():
                    dialog.destroy()
            except:
                pass
        
        dialog.protocol("WM_DELETE_WINDOW", on_closing)
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#7B1FA2", height=50)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text="✨ ВЫБЕРИТЕ УМЕНИЕ", font=("Arial", 16, "bold"),
                bg="#7B1FA2", fg="white").pack(pady=12)
        
        # Контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#2C2C2C")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#2C2C2C", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#2C2C2C")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Создаем карточки умений
        abilities_container = tk.Frame(scrollable_frame, bg="#2C2C2C")
        abilities_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Помечаем как контейнер для умений
        abilities_container._is_abilities_container = True
        
        player_class = self.player_data.get("class")
        player_mp = self.player_data.get("mp", 0)
        
        abilities_found = False
        
        # Внутренняя функция для безопасного использования умения
        def use_ability_safely(ab_id, dlg):
            """Обертка для безопасного использования умения"""
            try:
                # Закрываем окно
                if dlg and dlg.winfo_exists():
                    dlg.destroy()
                
                # Используем умение
                self.root.after(50, lambda: self.safe_use_ability_in_battle(ab_id))
            except Exception as e:
                print(f"⚠️ Ошибка в use_ability_safely: {e}")
        
        for ab_id in self.abilities:
            ability = self.abilities[ab_id]
            
            # Проверяем, подходит ли умение классу игрока
            if ability.class_requirement != player_class:
                continue
            
            abilities_found = True
            
            # Определяем доступность
            can_use = ability.can_use(player_mp, player_class)
            cooldown_info = ""
            
            if ability.current_cooldown > 0:
                can_use = False
                cooldown_info = f" (⏱️ {ability.current_cooldown}/{ability.cooldown})"
            
            # Создаем карточку умения
            ability_card = tk.Frame(abilities_container, bg="#424242", relief="raised", bd=2, padx=15, pady=12)
            ability_card.pack(fill="x", pady=8)
            
            # Верхняя часть - иконка и название
            top_frame = tk.Frame(ability_card, bg="#424242")
            top_frame.pack(fill="x", pady=(0, 10))
            
            tk.Label(top_frame, text=ability.icon, font=("Arial", 24),
                    bg="#424242", fg="white").pack(side="left", padx=(0, 15))
            
            name_frame = tk.Frame(top_frame, bg="#424242")
            name_frame.pack(side="left", fill="both", expand=True)
            
            tk.Label(name_frame, text=f"{ability.name}{cooldown_info}", 
                    font=("Arial", 13, "bold"), bg="#424242", fg="white").pack(anchor="w")
            
            # Описание
            desc_frame = tk.Frame(ability_card, bg="#424242")
            desc_frame.pack(fill="x", pady=(0, 10))
            
            tk.Label(desc_frame, text=ability.description, font=("Arial", 9),
                    bg="#424242", fg="#BDBDBD", wraplength=380, justify="left").pack(anchor="w")
            
            # Нижняя часть - стоимость и кнопка
            bottom_frame = tk.Frame(ability_card, bg="#424242")
            bottom_frame.pack(fill="x")
            
            # Информация о стоимости
            cost_frame = tk.Frame(bottom_frame, bg="#424242")
            cost_frame.pack(side="left", fill="y")
            
            tk.Label(cost_frame, text=f"💙 {ability.mana_cost} MP", font=("Arial", 10, "bold"),
                    bg="#424242", fg="#64B5F6").pack(side="left", padx=(0, 10))
            
            tk.Label(cost_frame, text=f"⏱️ {ability.cooldown} ход.", font=("Arial", 10),
                    bg="#424242", fg="#FFD54F").pack(side="left")
            
            # Кнопка использования
            btn_frame = tk.Frame(bottom_frame, bg="#424242")
            btn_frame.pack(side="right")
            
            btn_color = "#4CAF50" if can_use else "#757575"
            btn_text = "ИСПОЛЬЗОВАТЬ" if can_use else "НЕДОСТУПНО"
            
            use_btn = tk.Button(btn_frame, text=btn_text, font=("Arial", 10, "bold"),
                               bg=btn_color, fg="white", width=15,
                               command=lambda ab=ab_id, dlg=dialog: use_ability_safely(ab, dlg),
                               state="normal" if can_use else "disabled",
                               relief="raised", bd=2)
            use_btn.pack()
        
        if not abilities_found:
            tk.Label(abilities_container, text="❌ Нет доступных умений для вашего класса",
                    font=("Arial", 12, "bold"), bg="#2C2C2C", fg="#f44336").pack(pady=50)
        
        # Кнопка закрытия
        close_frame = tk.Frame(dialog, bg="#2C2C2C", pady=10)
        close_frame.pack(fill="x", padx=10)
        
        tk.Button(close_frame, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#757575", fg="white", width=15,
                 command=on_closing).pack()
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')
        
        # Поддержка прокрутки колесиком мыши
        def on_mousewheel(event):
            try:
                canvas.yview_scroll(int(-1*(event.delta/120)), "units")
            except:
                pass
        
        canvas.bind("<MouseWheel>", on_mousewheel)

    def use_ability_and_close(self, ability_id, dialog):
        """Использовать умение и закрыть окно (ПРОСТАЯ И БЕЗОПАСНАЯ ВЕРСИЯ)"""
        try:
            # Сохраняем ability_id в локальную переменную
            ab_id = ability_id
            
            # Сначала закрываем окно (но только если оно еще существует)
            if dialog and dialog.winfo_exists():
                try:
                    dialog.destroy()
                except:
                    pass
            
            # Используем умение через небольшой таймаут (чтобы окно успело закрыться)
            self.root.after(100, lambda: self.safe_use_ability_in_battle(ab_id))
            
        except Exception as e:
            print(f"⚠️ Ошибка в use_ability_and_close: {e}")

    def safe_use_ability_in_battle(self, ability_id):
        """Безопасное использование умения в бою"""
        try:
            if not self.battle_active or self.player_acted_this_turn:
                return
            
            if ability_id not in self.abilities:
                return
            
            ability = self.abilities[ability_id]
            player_mp = self.player_data.get("mp", 0)
            player_class = self.player_data.get("class")
            
            if not ability.can_use(player_mp, player_class):
                self.add_battle_log(f"Нельзя использовать {ability.name}!", "#EF5350")
                return
            
            self.player_acted_this_turn = True
            ability.use()
            self.player_data["mp"] -= ability.mana_cost
            
            # Блокируем кнопки
            if hasattr(self, 'attack_button'):
                try:
                    self.attack_button.config(state="disabled", bg="#9E9E9E")
                except:
                    pass
            
            if hasattr(self, 'abilities_button'):
                try:
                    self.abilities_button.config(state="normal", bg="#757575")
                except:
                    pass
            
            # Обновляем ману
            self.update_mana_display()
            
            # Применяем эффект
            if ability.effect_type == "damage":
                dmg = self.calculate_stats()["damage"]
                if self.battle_monster:
                    self.battle_monster.take_damage(dmg)
                self.add_battle_log(f"{ability.name}: {dmg} урона!", "#BB86FC")
            
            elif ability.effect_type == "defense":
                self.active_ability_effect = "defense"
                self.add_battle_log(f"{ability.name}: защита активирована!", "#4CAF50")
            
            elif ability.effect_type == "stun":
                if self.battle_monster:
                    self.battle_monster.stunned_turns = 2
                    self.add_battle_log(f"{ability.name}: монстр оглушен!", "#FFD54F")
            
            # Проверяем конец боя
            if self.battle_monster and self.battle_monster.hp <= 0:
                self.root.after(1500, lambda: self.check_battle_end())
            elif not self.monster_acted_this_turn:
                self.root.after(1500, lambda: self.monster_attack())
            
        except Exception as e:
            print(f"⚠️ Ошибка в safe_use_ability_in_battle: {e}")

    def apply_ability_effect_safe(self, ability):
        """Безопасное применение эффекта умения"""
        try:
            if ability.effect_type == "damage":
                # Вычисляем урон
                if ability.value == "50-150":
                    dmg_multiplier = random.uniform(0.5, 1.5)
                    dmg = int(self.calculate_stats()["damage"] * dmg_multiplier)
                else:
                    dmg = ability.value if ability.value else self.calculate_stats()["damage"]
                
                # Наносим урон
                if self.battle_monster:
                    self.battle_monster.take_damage(dmg)
                    
                    # Обновляем HP монстра
                    if hasattr(self, 'monster_hp_label'):
                        try:
                            self.monster_hp_label.config(
                                text=f"❤️ HP: {self.battle_monster.hp}/{self.battle_monster.hp_max}"
                            )
                        except:
                            pass
                
                self.add_battle_log(f"Вы используете {ability.name} и наносите {dmg} урона!", "#BB86FC")
                
                # Показываем анимацию
                try:
                    self.show_damage_animation(450, 80, f"-{dmg}", "#BB86FC")
                except:
                    pass
                
            elif ability.effect_type == "defense":
                self.active_ability_effect = "defense"
                self.add_battle_log(f"Вы используете {ability.name} - следующий удар будет отражен!", "#4CAF50")
                
            elif ability.effect_type == "stun":
                if self.battle_monster:
                    stun_turns = random.randint(1, 2)
                    self.battle_monster.stunned_turns = stun_turns
                    self.add_battle_log(f"Вы используете {ability.name} - монстр оглушен на {stun_turns} ход!", "#FFD54F")
            
        except Exception as e:
            print(f"⚠️ Ошибка в apply_ability_effect_safe: {e}")

    def check_battle_after_action(self):
        """Проверить состояние боя после действия"""
        try:
            # Проверяем, не убит ли монстр
            if self.battle_monster and self.battle_monster.hp <= 0:
                self.root.after(1500, lambda: self.check_battle_end())
                return
            
            # Если монстр еще не действовал, он атакует
            if not self.monster_acted_this_turn:
                self.root.after(1500, lambda: self.monster_attack())
            else:
                # Если оба действовали, ждем конца хода
                pass
                
        except Exception as e:
            print(f"⚠️ Ошибка в check_battle_after_action: {e}")
    
    def refresh_abilities_dialog(self, dialog):
        """Обновить диалог умений"""
        if not dialog or not dialog.winfo_exists():
            return
        
        # Очищаем старые карточки
        if hasattr(dialog, 'abilities_container'):
            for widget in dialog.abilities_container.winfo_children():
                widget.destroy()
        
        # Создаем новые карточки
        player_class = self.player_data.get("class")
        has_abilities = False
        
        for ab_id in self.equipped_abilities:
            if ab_id in self.abilities:
                ability = self.abilities[ab_id]
                if ability.class_requirement == player_class:
                    has_abilities = True
                    self.create_battle_ability_card(dialog.abilities_container, ability, dialog)
        
        if not has_abilities:
            empty_frame = tk.Frame(dialog.abilities_container, bg="#1A1A1A", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="✨", font=("Arial", 40), 
                    bg="#1A1A1A", fg="#BB86FC").pack(pady=10)
            tk.Label(empty_frame, text="Нет экипированных умений", font=("Arial", 14, "bold"), 
                    bg="#1A1A1A", fg="#FFFFFF").pack(pady=5)
        
        # Обновляем область прокрутки
        if hasattr(dialog, 'abilities_canvas'):
            dialog.abilities_canvas.configure(scrollregion=dialog.abilities_canvas.bbox("all"))
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')

    def create_battle_ability_card(self, parent, ability, dialog):
        """Создать карточку умения для боя"""
        ability_card = tk.Frame(parent, bg="#2D2D2D", relief="raised", bd=2, padx=10, pady=10)
        ability_card.pack(fill="x", pady=5)
        
        # Сохраняем ссылку на ability для обновления
        ability_card.ability = ability
        ability_card.dialog = dialog  # Сохраняем ссылку на диалог
        
        # Верхняя часть с иконкой и названием
        top_frame = tk.Frame(ability_card, bg="#2D2D2D")
        top_frame.pack(fill="x")
        
        tk.Label(top_frame, text=ability.icon, font=("Arial", 24),
                bg="#2D2D2D", fg="#BB86FC").pack(side="left", padx=(0, 10))
        
        info_frame = tk.Frame(top_frame, bg="#2D2D2D")
        info_frame.pack(side="left", fill="both", expand=True)
        
        tk.Label(info_frame, text=ability.name, font=("Arial", 12, "bold"),
                bg="#2D2D2D", fg="#FFFFFF").pack(anchor="w")
        
        # Статистики умения
        stats_frame = tk.Frame(ability_card, bg="#2D2D2D")
        stats_frame.pack(fill="x", pady=(5, 0))
        
        current_mp = self.player_data.get("mp", 0)
        player_class = self.player_data.get("class")
        
        tk.Label(stats_frame, text=f"💙 Мана: {ability.mana_cost}", 
                font=("Arial", 9), bg="#2D2D2D", fg="#64B5F6").pack(side="left", padx=(0, 10))
        
        tk.Label(stats_frame, text=f"🔁 Перезарядка: {ability.cooldown} ход.", 
                font=("Arial", 9), bg="#2D2D2D", fg="#FFB74D").pack(side="left", padx=(0, 10))
        
        # Отображаем текущую перезарядку
        ability_card.cooldown_label = tk.Label(stats_frame, text="", 
                font=("Arial", 9, "bold"), bg="#2D2D2D")
        ability_card.cooldown_label.pack(side="left")
        
        # Обновляем отображение перезарядки
        self.update_ability_cooldown_display(ability_card)
        
        # Описание
        desc_frame = tk.Frame(ability_card, bg="#3D3D3D", padx=5, pady=5)
        desc_frame.pack(fill="x", pady=5)
        
        tk.Label(desc_frame, text=ability.description, font=("Arial", 9),
                bg="#3D3D3D", fg="#E0E0E0", wraplength=350, justify="left").pack()
        
        # Кнопка использования
        btn_frame = tk.Frame(ability_card, bg="#2D2D2D")
        btn_frame.pack(fill="x", pady=(5, 0))
        
        ability_card.use_button = tk.Button(btn_frame, text="", 
                font=("Arial", 10, "bold"), width=15)
        ability_card.use_button.pack()
        
        # Обновляем состояние кнопки
        self.update_ability_button_state(ability_card)
        
        # Сохраняем ссылку для обновления
        ability_card.update_func = lambda: [
            self.update_ability_cooldown_display(ability_card),
            self.update_ability_button_state(ability_card)
        ]
    
    def update_ability_cooldown_display(self, ability_card):
        """Обновить отображение перезарядки умения"""
        ability = ability_card.ability
        
        if ability.current_cooldown > 0:
            cooldown_color = "#f44336"
            cooldown_text = f"⏳ Перезарядка: {ability.current_cooldown}"
        else:
            cooldown_color = "#4CAF50"
            cooldown_text = "✅ Готово"
        
        ability_card.cooldown_label.config(text=cooldown_text, fg=cooldown_color)
    
    def update_ability_button_state(self, ability_card):
        """Обновить состояние кнопки умения"""
        ability = ability_card.ability
        current_mp = self.player_data.get("mp", 0)
        player_class = self.player_data.get("class")
        
        can_use = ability.can_use(current_mp, player_class)
        
        if can_use:
            ability_card.use_button.config(
                text="⚡ Использовать",
                bg="#4CAF50",
                fg="white",
                state="normal",
                command=lambda: self.use_ability_in_battle(ability, ability_card.dialog)
            )
        else:
            if ability.current_cooldown > 0:
                ability_card.use_button.config(
                    text=f"⏳ На перезарядке",
                    bg="#757575",
                    fg="white",
                    state="disabled"
                )
            elif current_mp < ability.mana_cost:
                ability_card.use_button.config(
                    text=f"💙 Недостаточно маны",
                    bg="#757575",
                    fg="white",
                    state="disabled"
                )
            else:
                ability_card.use_button.config(
                    text="⚡ Использовать",
                    bg="#757575",
                    fg="white",
                    state="disabled"
                )

    # ================ ИСПОЛЬЗОВАНИЕ УМЕНИЯ В БОЮ (ОБНОВЛЕНИЕ) ================
    def use_ability_in_battle(self, ability_id):
        """Использовать умение в бою (ИСПРАВЛЕННАЯ ВЕРСИЯ)"""
        try:
            if (not self.battle_active or 
                self.player_acted_this_turn or 
                ability_id not in self.abilities):
                return
            
            ability = self.abilities[ability_id]
            player_mp = self.player_data.get("mp", 0)
            player_class = self.player_data.get("class")
            
            # Проверяем, можно ли использовать умение
            if not ability.can_use(player_mp, player_class):
                self.add_battle_log(f"Нельзя использовать {ability.name}!", "#EF5350")
                return
            
            self.player_acted_this_turn = True
            
            # Блокируем кнопки после действия
            if hasattr(self, 'attack_button'):
                try:
                    self.attack_button.config(state="disabled", bg="#9E9E9E")
                except:
                    pass
            
            if hasattr(self, 'abilities_button'):
                try:
                    self.abilities_button.config(state="disabled", bg="#757575")
                except:
                    pass
            
            # Используем умение
            ability.use()
            self.player_data["mp"] -= ability.mana_cost
            self.update_mana_display()
            
            # Применяем эффект умения
            if ability.effect_type == "damage":
                # Урон от умения
                if ability.value == "50-150":
                    dmg_multiplier = random.uniform(0.5, 1.5)
                    dmg = int(self.calculate_stats()["damage"] * dmg_multiplier)
                else:
                    dmg = ability.value if ability.value else self.calculate_stats()["damage"]
                
                if self.battle_monster:
                    self.battle_monster.take_damage(dmg)
                    if hasattr(self, 'monster_hp_label'):
                        try:
                            self.monster_hp_label.config(text=f"❤️ HP: {self.battle_monster.hp}/{self.battle_monster.hp_max}")
                        except:
                            pass
                
                self.add_battle_log(f"Вы используете {ability.name} и наносите {dmg} урона!", "#BB86FC")
                
                try:
                    self.show_damage_animation(450, 80, f"-{dmg}", "#BB86FC")
                except:
                    pass
            
            elif ability.effect_type == "defense":
                self.active_ability_effect = "defense"
                self.add_battle_log(f"Вы используете {ability.name} - следующий удар будет отражен!", "#4CAF50")
            
            elif ability.effect_type == "stun":
                if self.battle_monster:
                    stun_turns = random.randint(1, 2)
                    self.battle_monster.stunned_turns = stun_turns
                    self.add_battle_log(f"Вы используете {ability.name} - монстр оглушен на {stun_turns} ход!", "#FFD54F")
            
            # Обновляем отображение умений
            try:
                self.update_ability_buttons_availability()
            except:
                pass
            
            # Проверяем, не убит ли монстр
            if self.battle_monster and self.battle_monster.hp <= 0:
                try:
                    self.root.after(1500, lambda: self.check_battle_end())
                except:
                    pass
            else:
                # Если монстр еще не действовал, он атакует
                if not self.monster_acted_this_turn:
                    try:
                        self.root.after(1500, lambda: self.monster_attack())
                    except:
                        pass
                else:
                    # Если оба действовали, проверяем конец боя
                    try:
                        self.root.after(1500, lambda: self.check_battle_end())
                    except:
                        pass
                        
        except Exception as e:
            print(f"⚠️ Критическая ошибка в use_ability_in_battle: {e}")
        
        # ================ АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ОКНА УМЕНИЙ ================
        # Обновляем все открытые окна умений
        self.update_all_abilities_windows()
        
        # Проверяем, убит ли монстр
        if self.battle_monster.hp <= 0:
            self.add_battle_log(f"Монстр {self.battle_monster.name} побежден!", "#4CAF50")
            self.root.after(2000, lambda: self.end_battle(True, self.battle_monster, self.current_location))

    # ================ КОНТЕКСТНЫЙ РЕДАКТОР ================
    def open_contextual_editor(self, event=None):
        if not self.is_admin():
            messagebox.showinfo("Доступ запрещен", "Эта функция доступна только администратору.")
            return
        
        dialog = tk.Toplevel(self.root)
        dialog.title("🛠 Контекстный редактор")
        dialog.geometry("400x350")
        dialog.configure(bg="#F5F5F5")
        dialog.transient(self.root)
        dialog.grab_set()
        
        canvas = tk.Canvas(dialog, height=60, bg="#4A154B")
        canvas.pack(fill="x")
        canvas.create_rectangle(0, 0, 400, 30, fill="#6A1B9A", outline="")
        canvas.create_text(200, 30, text="🛠 Контекстный редактор", fill="white",
                           font=("Arial", 14, "bold"))
        
        main_frame = tk.Frame(dialog, bg="#F5F5F5")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        tk.Label(main_frame, text="Выберите раздел для редактирования:", 
                font=("Arial", 11, "bold"), bg="#F5F5F5", fg="#5E35B1").pack(pady=(0, 20))
        
        # Кнопки выбора редактора
        btn_frame = tk.Frame(main_frame, bg="#F5F5F5")
        btn_frame.pack(fill="both", expand=True)
        
        btn_players = tk.Button(btn_frame, text="👥 Редактор игроков", font=("Arial", 11, "bold"),
                          bg="#9C27B0", fg="white", height=2, width=25,
                          command=lambda: [dialog.destroy(), self.open_players_editor()])
        btn_players.pack(pady=10)

        btn_items = tk.Button(btn_frame, text="📦 Редактор предметов", font=("Arial", 11, "bold"),
                            bg="#2196F3", fg="white", height=2, width=25,
                            command=lambda: [dialog.destroy(), self.open_items_editor()])
        btn_items.pack(pady=10)
        
        btn_locations = tk.Button(btn_frame, text="📍 Редактор локаций", font=("Arial", 11, "bold"),
                                bg="#9C27B0", fg="white", height=2, width=25,
                                command=lambda: [dialog.destroy(), self.open_locations_editor()])
        btn_locations.pack(pady=10)
        
        btn_abilities = tk.Button(btn_frame, text="✨ Редактор умений", font=("Arial", 11, "bold"),
                                bg="#FF9800", fg="white", height=2, width=25,
                                command=lambda: [dialog.destroy(), self.open_abilities_editor()])
        btn_abilities.pack(pady=10)
        
        tk.Button(dialog, text="❌ Закрыть", bg="#757575", fg="white",
                 font=("Arial", 10), width=15, command=dialog.destroy).pack(pady=10)

    # ================ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ================
    def pick_color(self, var, preview):
        color = colorchooser.askcolor(color=var.get(), title="Выберите цвет")[1]
        if color:
            var.set(color)
            preview.config(bg=color)
            btn = preview.master.winfo_children()[-1]
            btn.config(bg=color)
            btn.config(fg="white" if self.is_dark_color(color) else "black")

    def is_dark_color(self, hex_color):
        """Проверяет, является ли цвет темным"""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join([c*2 for c in hex_color])
        
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        
        # Формула для определения яркости
        brightness = (r * 299 + g * 587 + b * 114) / 1000
        return brightness < 128

    def create_editor_card(self, parent, loc, btn_id, cfg, editor):
        frame = tk.Frame(parent, relief="groove", bd=1, padx=15, pady=15, bg="white")
        frame.pack(fill="x", padx=5, pady=10)
        
        tk.Label(frame, text=f"Кнопка: {btn_id}", font=("Arial", 11, "bold"), bg="white").pack(anchor="w")
        tk.Label(frame, text=f"Текущий текст: «{cfg.get('text', '')}»", fg="#666", bg="white").pack(anchor="w",
                                                                                                   pady=(0, 5))
        
        fields = [
            ("Текст", "text", 25), ("Шрифт", "font_family", 12), ("Размер", "font_size", 4),
            ("Жирный", "bold", None), ("Ширина", "width", 6), ("Высота", "height", 6),
            ("X (←→)", "x", 6), ("Y (↑↓)", "y", 6)
        ]
        vars = {}
        
        for i, (label, key, width) in enumerate(fields):
            row = tk.Frame(frame, bg="white")
            row.pack(fill="x", pady=1)
            tk.Label(row, text=label + ":", width=12, anchor="w", bg="white").pack(side="left")
            value = cfg.get(key, "")
            
            if key == "bold":
                var = tk.BooleanVar(value=bool(value))
                tk.Checkbutton(row, variable=var, bg="white").pack(side="left")
            elif key == "font_family":
                var = tk.StringVar(value=str(value))
                fonts = ["Arial", "Courier New", "Times New Roman", "Verdana"]
                ttk.Combobox(row, textvariable=var, values=fonts, state="readonly", width=width or 12).pack(
                    side="left")
            else:
                var = tk.StringVar(value=str(value))
                tk.Entry(row, textvariable=var, width=width or 8).pack(side="left")
            vars[key] = var
        
        color_frame = tk.Frame(frame, bg="white")
        color_frame.pack(fill="x", pady=5)
        
        bg_var = tk.StringVar(value=cfg.get("bg", "#4CAF50"))
        tk.Label(color_frame, text="Фон:", bg="white", width=12, anchor="w").pack(side="left")
        bg_preview = tk.Label(color_frame, bg=bg_var.get(), width=4, height=1, relief="sunken")
        bg_preview.pack(side="left", padx=2)
        tk.Button(color_frame, text="🎨 Выбрать", command=lambda: self.pick_color(bg_var, bg_preview),
                  bg=bg_var.get(), fg="white" if self.is_dark_color(bg_var.get()) else "black").pack(
            side="left", padx=2)
        
        fg_var = tk.StringVar(value=cfg.get("fg", "#FFFFFF"))
        tk.Label(color_frame, text="Текст:", bg="white", width=12, anchor="w").pack(side="left", padx=(10, 0))
        fg_preview = tk.Label(color_frame, bg=fg_var.get(), width=4, height=1, relief="sunken")
        fg_preview.pack(side="left", padx=2)
        tk.Button(color_frame, text="🅰️ Выбрать", command=lambda: self.pick_color(fg_var, fg_preview),
                  bg=fg_var.get(), fg="white" if self.is_dark_color(fg_var.get()) else "black").pack(
            side="left", padx=2)
        
        vars["bg"] = bg_var
        vars["fg"] = fg_var
        
        trans_frame = tk.Frame(frame, bg="white")
        trans_frame.pack(fill="x", pady=3)
        is_trans = tk.BooleanVar(value=bool(cfg.get("is_transition", False)))
        tk.Checkbutton(trans_frame, text="5-сек переход", variable=is_trans, bg="white").pack(anchor="w")
        vars["is_transition"] = is_trans
        
        target = tk.StringVar(value=str(cfg.get("target_location", "")))
        tk.Label(trans_frame, text="Цель:", bg="white").pack(anchor="w")
        locs = list(self.config["locations"].keys())
        ttk.Combobox(trans_frame, textvariable=target, values=locs, state="readonly", width=20).pack(anchor="w",
                                                                                                      pady=1)
        vars["target_location"] = target
        
        btns = tk.Frame(frame, bg="white")
        btns.pack(pady=8)
        tk.Button(btns, text="✅ Применить", bg="#4CAF50", fg="white", width=14,
                  command=lambda: self.apply_edit(loc, btn_id, vars, cfg, editor)).pack(side="left", padx=2)
        tk.Button(btns, text="🗑 Удалить", bg="#f44336", fg="white", width=14,
                  command=lambda: self.delete_button(loc, btn_id, editor)).pack(side="left", padx=2)
        
        setattr(self, f"vars_{loc}_{btn_id}", vars)

    def apply_edit(self, loc, btn_id, vars, cfg, editor):
        for k, var in vars.items():
            if k == "bold":
                cfg[k] = var.get()
            elif k in ["font_size", "x", "y", "width", "height"]:
                try:
                    cfg[k] = int(var.get())
                except:
                    pass
            else:
                cfg[k] = var.get()
        save_config(self.config)
        self.refresh_current_location()

    def delete_button(self, loc, btn_id, editor):
        if messagebox.askyesno("🗑 Удалить", f"Удалить кнопку '{btn_id}'?", parent=editor):
            if btn_id in self.config["locations"][loc]:
                del self.config["locations"][loc][btn_id]
                save_config(self.config)
                self.refresh_current_location()
                editor.destroy()
                self.open_locations_editor()

    def add_button_dialog(self, editor, loc):
        dialog = tk.Toplevel(editor)
        dialog.title("➕ Добавить кнопку")
        dialog.geometry("350x350")
        dialog.transient(editor)
        dialog.grab_set()
        
        tk.Label(dialog, text="➕ ДОБАВЛЕНИЕ КНОПКИ", font=("Arial", 12, "bold"), 
                bg="#F5F5F5", fg="#5E35B1").pack(pady=(10, 20))
        
        name = tk.StringVar(value="Новая кнопка")
        key = tk.StringVar(value=f"btn_{len([k for k in self.config['locations'][loc] if isinstance(self.config['locations'][loc][k], dict)]) + 1}")
        is_trans = tk.BooleanVar(value=False)
        target = tk.StringVar(value=list(self.config["locations"].keys())[0])
        
        tk.Label(dialog, text="Текст кнопки:", bg="#F5F5F5").pack(anchor="w", padx=20)
        tk.Entry(dialog, textvariable=name, width=30).pack(padx=20, pady=5)
        
        tk.Label(dialog, text="Ключ (уникальный):", bg="#F5F5F5").pack(anchor="w", padx=20)
        tk.Entry(dialog, textvariable=key, width=30).pack(padx=20, pady=5)
        
        tk.Checkbutton(dialog, text="5-секундный переход?", variable=is_trans, bg="#F5F5F5").pack(anchor="w", padx=20, pady=5)
        
        tk.Label(dialog, text="Целевая локация:", bg="#F5F5F5").pack(anchor="w", padx=20)
        locs = list(self.config["locations"].keys())
        ttk.Combobox(dialog, textvariable=target, values=locs, state="readonly", width=28).pack(padx=20, pady=5)
        
        default_values_frame = tk.Frame(dialog, bg="#F5F5F5", relief="ridge", bd=2, padx=10, pady=10)
        default_values_frame.pack(fill="x", padx=20, pady=10)
        
        tk.Label(default_values_frame, text="Стандартные значения:", font=("Arial", 10, "bold"), 
                bg="#F5F5F5").pack(anchor="w", pady=(0, 5))
        
        tk.Label(default_values_frame, text="X: 100, Y: 100, Ширина: 150, Высота: 40", 
                bg="#F5F5F5", font=("Arial", 9)).pack(anchor="w")
        tk.Label(default_values_frame, text="Шрифт: Arial, Размер: 12, Жирный: Да", 
                bg="#F5F5F5", font=("Arial", 9)).pack(anchor="w")
        tk.Label(default_values_frame, text="Цвета: Фон #4CAF50, Текст #FFFFFF", 
                bg="#F5F5F5", font=("Arial", 9)).pack(anchor="w")
        
        def add():
            k = key.get().strip()
            if not k:
                messagebox.showerror("Ошибка", "Введите ключ кнопки", parent=dialog)
                return
            if k in self.config["locations"][loc]:
                messagebox.showerror("Ошибка", "Ключ должен быть уникальным", parent=dialog)
                return
            
            self.config["locations"][loc][k] = {
                "text": name.get(), 
                "font_family": "Arial", 
                "font_size": 12, 
                "bold": True,
                "bg": "#4CAF50", 
                "fg": "#FFFFFF", 
                "x": 100, 
                "y": 100,
                "width": 150, 
                "height": 40, 
                "is_transition": is_trans.get(),
                "target_location": target.get() if is_trans.get() else None
            }
            save_config(self.config)
            dialog.destroy()
            editor.destroy()
            self.open_locations_editor()
        
        tk.Button(dialog, text="✅ Добавить", bg="#4CAF50", fg="white",
                 font=("Arial", 10, "bold"), command=add).pack(pady=10)

    def add_new_location(self, editor):
        dialog = tk.Toplevel(editor)
        dialog.title("➕ Новая локация")
        dialog.geometry("350x250")
        dialog.transient(editor)
        dialog.grab_set()
        
        tk.Label(dialog, text="Название локации:", font=("Arial", 10, "bold"), 
                bg="#F5F5F5").pack(pady=(10, 2))
        name_var = tk.StringVar()
        tk.Entry(dialog, textvariable=name_var, width=30).pack()
        
        colors_frame = tk.Frame(dialog, bg="#F5F5F5")
        colors_frame.pack(pady=10)
        
        tk.Label(colors_frame, text="Цвет фона:", bg="#F5F5F5").pack()
        bg_var = tk.StringVar(value="#FFFFFF")
        bg_preview = tk.Label(colors_frame, bg=bg_var.get(), width=4, height=1, relief="sunken")
        bg_preview.pack(side="left", padx=5)
        tk.Button(colors_frame, text="🎨", command=lambda: self.pick_color(bg_var, bg_preview)).pack(side="left")
        
        tk.Label(colors_frame, text="  Цвет текста:", bg="#F5F5F5").pack(side="left", padx=(10, 0))
        fg_var = tk.StringVar(value="#000000")
        fg_preview = tk.Label(colors_frame, bg=fg_var.get(), width=4, height=1, relief="sunken")
        fg_preview.pack(side="left", padx=5)
        tk.Button(colors_frame, text="🅰️", command=lambda: self.pick_color(fg_var, fg_preview)).pack(side="left")
        
        def add():
            name = name_var.get().strip()
            if not name:
                messagebox.showerror("Ошибка", "Введите название локации", parent=dialog)
                return
            if name in self.config["locations"]:
                messagebox.showerror("Ошибка", "Локация с таким именем уже существует", parent=dialog)
                return
            
            self.config["locations"][name] = {
                "title": name,
                "bg_color": bg_var.get(),
                "fg_color": fg_var.get(),
                "loot_pile": {
                    "x": 20,
                    "y": 350,
                    "width": 200,
                    "height": 120,
                    "visible": True,
                    "bg_color": "#8B4513",
                    "fg_color": "#FFFFFF",
                    "items": []
                }
            }
            save_config(self.config)
            dialog.destroy()
            editor.destroy()
            self.open_locations_editor()
        
        tk.Button(dialog, text="✅ Добавить", bg="#4CAF50", fg="white", 
                 font=("Arial", 10, "bold"), command=add).pack(pady=10)
        
        tk.Button(dialog, text="❌ Отмена", bg="#757575", fg="white",
                 command=dialog.destroy).pack(pady=5)

    def delete_current_location(self, editor):
        loc = self.current_location
        if loc == "Главная":
            messagebox.showerror("❌ Ошибка", "Нельзя удалить главную локацию.")
            return
        
        if messagebox.askyesno("🗑 Удалить", f"Удалить локацию '{loc}'? Это удалит все её кнопки и настройки.",
                               parent=editor):
            if loc in self.config["locations"]:
                del self.config["locations"][loc]
                for l_name, l_cfg in self.config["locations"].items():
                    for btn_id, btn_cfg in l_cfg.items():
                        if isinstance(btn_cfg, dict) and btn_cfg.get("target_location") == loc:
                            btn_cfg["target_location"] = "Главная"
                save_config(self.config)
                if self.current_location == loc:
                    self.current_location = "Главная"
                    self.refresh_current_location()
                editor.destroy()
                self.open_locations_editor()

    # ================ СИСТЕМА РЕГЕНЕРАЦИИ ================
    def start_regeneration(self):
        """Регенерация HP и MP (запускается каждые 2 секунды)"""
        # Проверяем, существует ли главное окно
        if not self.root or not self.root.winfo_exists():
            return
            
        if self.battle_active or (hasattr(self, 'editor_window') and self.editor_window and self.editor_window.winfo_exists()):
            # Не регенерируем во время боя или в редакторе
            self.regeneration_timer = self.root.after(2000, self.start_regeneration)
            return

        updated = False
        
        # Регенерация HP
        current_hp = self.player_data.get("hp", 0)
        max_hp = self.player_data.get("hp_max", 100)
        
        if current_hp < max_hp:
            self.player_data["hp"] += 1
            if self.player_data["hp"] > max_hp:
                self.player_data["hp"] = max_hp
            updated = True
            
            # Безопасное обновление здоровья
            self.safe_update_health_display()
            
            # Показываем анимацию только если sidebar существует и открыт
            try:
                if hasattr(self, 'sidebar_open') and self.sidebar_open:
                    if hasattr(self, 'sidebar_frame') and self.sidebar_frame and self.sidebar_frame.winfo_exists():
                        self.update_sidebar_stats()
                        self.animate_gain(self.sidebar_frame, 120, 45, "+1", "#FF5252")
            except:
                pass  # Игнорируем ошибки анимации

        # Регенерация MP
        current_mp = self.player_data.get("mp", 0)
        max_mp = self.player_data.get("mp_max", 20)
        
        if current_mp < max_mp:
            self.player_data["mp"] += 1
            if self.player_data["mp"] > max_mp:
                self.player_data["mp"] = max_mp
            updated = True
            
            # Безопасное обновление маны
            self.safe_update_mana_display()
            
            # Показываем анимацию только если sidebar существует и открыт
            try:
                if hasattr(self, 'sidebar_open') and self.sidebar_open:
                    if hasattr(self, 'sidebar_frame') and self.sidebar_frame and self.sidebar_frame.winfo_exists():
                        self.update_sidebar_stats()
                        self.animate_gain(self.sidebar_frame, 120, 85, "+1", "#448AFF")
            except:
                pass  # Игнорируем ошибки анимации

        if updated:
            self.save_current_player()

        # Планируем следующую регенерацию, только если окно еще существует
        try:
            if self.root.winfo_exists():
                self.regeneration_timer = self.root.after(2000, self.start_regeneration)
        except tk.TclError:
            # Если окно закрыто, прекращаем таймеры
            pass

    def safe_update_health_display(self):
        """Безопасное обновление отображения здоровья"""
        try:
            # Обновляем в боковом меню
            if self.sidebar_open and self.sidebar_frame and self.sidebar_frame.winfo_exists():
                if 'hp_value' in self.sidebar_widgets:
                    widget = self.sidebar_widgets['hp_value']
                    if widget and widget.winfo_exists():
                        widget.config(
                            text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
                        )
            
            # Обновляем в интерфейсе персонажа
            if hasattr(self, 'player_hp_label') and self.player_hp_label:
                try:
                    if self.player_hp_label.winfo_exists():
                        self.player_hp_label.config(
                            text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
                        )
                except:
                    pass
            
            # Обновляем в бою
            if self.battle_active and hasattr(self, 'player_hp_label'):
                try:
                    if self.player_hp_label and self.player_hp_label.winfo_exists():
                        self.player_hp_label.config(
                            text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
                        )
                except:
                    pass
        except Exception as e:
            print(f"⚠️ Ошибка обновления здоровья: {e}")

    def safe_update_mana_display(self):
        """Безопасное обновление отображения маны"""
        try:
            # Обновляем в боковом меню
            if self.sidebar_open and self.sidebar_frame and self.sidebar_frame.winfo_exists():
                if 'mp_value' in self.sidebar_widgets:
                    widget = self.sidebar_widgets['mp_value']
                    if widget and widget.winfo_exists():
                        widget.config(
                            text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
                        )
            
            # Обновляем в интерфейсе персонажа
            if hasattr(self, 'player_mp_label') and self.player_mp_label:
                try:
                    if self.player_mp_label.winfo_exists():
                        self.player_mp_label.config(
                            text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
                        )
                except:
                    pass
            
            # Обновляем в бою
            if self.battle_active and hasattr(self, 'player_mp_label'):
                try:
                    if self.player_mp_label and self.player_mp_label.winfo_exists():
                        self.player_mp_label.config(
                            text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
                        )
                except:
                    pass
        except Exception as e:
            print(f"⚠️ Ошибка обновления маны: {e}")

    def update_health_display(self):
        """Обновить отображение здоровья (для обратной совместимости)"""
        self.safe_update_health_display()

    def update_mana_display(self):
        """Обновить отображение маны (для обратной совместимости)"""
        self.safe_update_mana_display()

    # ================ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ================
    def update_component(self, component_name, *args):
        """Обновить конкретный компонент интерфейса"""
        try:
            if component_name == "health":
                self.safe_update_health_display()
            elif component_name == "mana":
                self.safe_update_mana_display()
            elif component_name == "stats":
                if self.sidebar_open and self.sidebar_frame and self.sidebar_frame.winfo_exists():
                    self.update_sidebar_stats()
            elif component_name == "inventory":
                if self.current_screen == "inventory":
                    self.show_inventory()
            elif component_name == "character":
                if self.current_screen == "character":
                    self.show_character()
        except Exception as e:
            print(f"⚠️ Ошибка обновления компонента {component_name}: {e}")

    def update_sidebar_stats(self):
        """Обновить статистики в боковом меню"""
        try:
            # Проверяем существование всех виджетов
            if not hasattr(self, 'sidebar_open') or not self.sidebar_open:
                return
                
            if not hasattr(self, 'sidebar_frame') or not self.sidebar_frame:
                return
                
            if not self.sidebar_frame.winfo_exists():
                return
            
            # Обновляем HP
            if 'hp_value' in self.sidebar_widgets:
                widget = self.sidebar_widgets['hp_value']
                if widget and widget.winfo_exists():
                    widget.config(
                        text=f"{self.player_data.get('hp', 100)}/{self.player_data.get('hp_max', 100)}"
                    )
            
            # Обновляем MP
            if 'mp_value' in self.sidebar_widgets:
                widget = self.sidebar_widgets['mp_value']
                if widget and widget.winfo_exists():
                    widget.config(
                        text=f"{self.player_data.get('mp', 20)}/{self.player_data.get('mp_max', 20)}"
                    )
            
            stats = self.calculate_stats()
            
            # Обновляем урон
            if 'dmg_value' in self.sidebar_widgets:
                widget = self.sidebar_widgets['dmg_value']
                if widget and widget.winfo_exists():
                    widget.config(text=str(stats["damage"]))
            
            # Обновляем броню
            if 'armor_value' in self.sidebar_widgets:
                widget = self.sidebar_widgets['armor_value']
                if widget and widget.winfo_exists():
                    widget.config(text=str(stats["armor"]))
                    
        except Exception as e:
            # Игнорируем ошибки обновления UI
            pass

    def calculate_default_exp_for_monster(self, hp_max_var, max_dmg_var, exp_var):
        """Рассчитать опыт по умолчанию для монстра"""
        try:
            hp_max = hp_max_var.get()
            max_dmg = max_dmg_var.get()
            default_exp = (hp_max // 2) + (max_dmg * 2)
            exp_var.set(default_exp)
        except:
            exp_var.set(50)  # Значение по умолчанию при ошибке

    def test_damage_formula(self):
        """Тестирование формулы урона"""
        print("=== ТЕСТ ФОРМУЛЫ УРОНА ===")
        print(f"Уровень: {self.player_data.get('level', 1)}")
        print(f"Класс: {self.player_data.get('class', 'Воин')}")
        print(f"Оружие: {self.player_data.get('equipped', {}).get('weapon', 'нет')}")
        
        # Базовый урон от уровня
        base_level_damage = self.calculate_base_level_damage()
        print(f"Базовый урон от уровня: {base_level_damage}")
        
        # Урон от оружия
        weapon_damage = self.calculate_weapon_damage()
        print(f"Урон от оружия: {weapon_damage}")
        
        # Бонус от класса
        class_bonus = self.calculate_class_damage_bonus()
        print(f"Бонус от класса: {class_bonus}")
        
        # Общий урон
        stats = self.calculate_stats()
        print(f"Общий урон: {stats['damage']}")
        print(f"Броня: {stats['armor']}")
        print("==========================")

    # ================ АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ УМЕНИЙ ================
    def update_all_abilities_windows(self):
        """Обновить все открытые окна умений"""
        # Ищем все открытые окна умений
        for widget in self.root.winfo_children():
            if isinstance(widget, tk.Toplevel) and "Умения в бою" in widget.title():
                # Обновляем содержимое окна
                self.refresh_abilities_window(widget)
                
    def refresh_abilities_window(self, dialog):
        """Обновить содержимое окна умений"""
        if not dialog or not dialog.winfo_exists():
            return
        
        # Получаем контейнер для умений
        container = None
        for widget in dialog.winfo_children():
            if isinstance(widget, tk.Frame):
                # Ищем canvas внутри фрейма
                for child in widget.winfo_children():
                    if isinstance(child, tk.Canvas):
                        container = child
                        break
                if container:
                    break
        
        if not container:
            return
        
        # Очищаем старое содержимое
        for widget in container.winfo_children():
            if isinstance(widget, tk.Frame):
                # Ищем scrollable frame
                for child in widget.winfo_children():
                    if isinstance(child, tk.Frame):
                        # Очищаем все карточки умений
                        for card in child.winfo_children():
                            card.destroy()
                        
                        # Создаем новые карточки
                        player_class = self.player_data.get("class")
                        has_abilities = False
                        
                        for ab_id in self.equipped_abilities:
                            if ab_id in self.abilities:
                                ability = self.abilities[ab_id]
                                if ability.class_requirement == player_class:
                                    has_abilities = True
                                    self.create_battle_ability_card(child, ability, dialog)
                        
                        if not has_abilities:
                            empty_frame = tk.Frame(child, bg="#1A1A1A", height=150)
                            empty_frame.pack(fill="both", expand=True, pady=30)
                            
                            tk.Label(empty_frame, text="✨", font=("Arial", 40), 
                                    bg="#1A1A1A", fg="#BB86FC").pack(pady=10)
                            tk.Label(empty_frame, text="Нет экипированных умений", font=("Arial", 14, "bold"), 
                                    bg="#1A1A1A", fg="#FFFFFF").pack(pady=5)
                        
                        # Обновляем область прокрутки
                        container.configure(scrollregion=container.bbox("all"))
                        break
        
        # Обновляем информацию о мане
        self.update_mana_in_abilities_window(dialog)
    
    def update_mana_in_abilities_window(self, dialog):
        """Обновить информацию о мане в окне умений"""
        if not dialog or not dialog.winfo_exists():
            return
        
        # Ищем фрейм с информацией о мане
        for widget in dialog.winfo_children():
            if isinstance(widget, tk.Frame):
                for child in widget.winfo_children():
                    if isinstance(child, tk.Frame):
                        # Проверяем, есть ли в этом фрейме информация о мане
                        for grandchild in child.winfo_children():
                            if isinstance(grandchild, tk.Label) and "МАНА:" in grandchild.cget("text"):
                                # Обновляем текст маны
                                current_mp = self.player_data.get("mp", 0)
                                max_mp = self.player_data.get("mp_max", 20)
                                grandchild.config(text=f"💙 МАНА: {current_mp}/{max_mp}")
                                return

    # ================ ОБНОВЛЕНИЕ КАРТОЧЕК УМЕНИЙ ================
    def update_all_ability_cards(self):
        """Обновить все карточки умений"""
        # Обновляем кнопки умений на панели боя
        self.update_ability_buttons_availability()
        
        # Обновляем открытые окна умений
        for widget in self.root.winfo_children():
            if isinstance(widget, tk.Toplevel) and "Умения" in widget.title():
                try:
                    widget.destroy()
                    # Пересоздаем окно если нужно
                    if not self.player_acted_this_turn:
                        self.root.after(100, self.show_battle_abilities)
                except:
                    pass
    
    def update_ability_cards_in_window(self, dialog):
        """Обновить карточки умений в указанном окне"""
        if not dialog or not dialog.winfo_exists():
            return
        
        # Ищем все карточки умений
        for widget in dialog.winfo_children():
            if isinstance(widget, tk.Frame):
                self._recursive_update_ability_cards(widget)
    
    def _recursive_update_ability_cards(self, parent):
        """Рекурсивно обновить карточки умений"""
        for widget in parent.winfo_children():
            if hasattr(widget, 'update_func'):
                # Это карточка умения - вызываем функцию обновления
                try:
                    widget.update_func()
                except:
                    pass
            elif isinstance(widget, tk.Frame):
                # Рекурсивно проверяем вложенные виджеты
                self._recursive_update_ability_cards(widget)

    def use_consumable(self, item_id, item_data=None):
        """Использовать расходник"""
        if not self.player_data:
            return False
        
        items_db = self.load_items()
        
        # Получаем данные предмета
        if not item_data:
            if isinstance(item_id, dict):
                item_data = item_id
                item_id = item_data.get("base_item_id", item_data.get("id", ""))
            else:
                item_data = items_db.get(item_id, {})
        
        # Проверяем, является ли предмет расходником
        if item_data.get("type") != "consumable":
            messagebox.showinfo("Информация", "Это не расходник!")
            return False
        
        # Получаем эффект и значение
        effect = item_data.get("effect", "heal")
        value = item_data.get("value", 0)
        
        if effect == "heal":
            # Лечение здоровья
            current_hp = self.player_data.get("hp", 0)
            max_hp = self.player_data.get("hp_max", 100)
            
            if current_hp >= max_hp:
                messagebox.showinfo("Информация", "У вас уже максимальное здоровье!")
                return False
            
            new_hp = min(current_hp + value, max_hp)
            heal_amount = new_hp - current_hp
            self.player_data["hp"] = new_hp
            
            self.show_animated_message(f"Восстановлено {heal_amount} HP", "#4CAF50", 1500)
            
        elif effect == "mana":
            # Восстановление маны
            current_mp = self.player_data.get("mp", 0)
            max_mp = self.player_data.get("mp_max", 20)
            
            if current_mp >= max_mp:
                messagebox.showinfo("Информация", "У вас уже максимальная мана!")
                return False
            
            new_mp = min(current_mp + value, max_mp)
            mana_amount = new_mp - current_mp
            self.player_data["mp"] = new_mp
            
            self.show_animated_message(f"Восстановлено {mana_amount} MP", "#2196F3", 1500)
            
        elif effect == "both":
            # Восстановление и здоровья, и маны
            used = False
            
            # Лечение здоровья
            current_hp = self.player_data.get("hp", 0)
            max_hp = self.player_data.get("hp_max", 100)
            
            if current_hp < max_hp:
                new_hp = min(current_hp + value, max_hp)
                heal_amount = new_hp - current_hp
                self.player_data["hp"] = new_hp
                used = True
                self.show_animated_message(f"Восстановлено {heal_amount} HP", "#4CAF50", 1500)
            
            # Восстановление маны
            current_mp = self.player_data.get("mp", 0)
            max_mp = self.player_data.get("mp_max", 20)
            
            if current_mp < max_mp:
                new_mp = min(current_mp + value, max_mp)
                mana_amount = new_mp - current_mp
                self.player_data["mp"] = new_mp
                used = True
                self.show_animated_message(f"Восстановлено {mana_amount} MP", "#2196F3", 1500)
            
            if not used:
                messagebox.showinfo("Информация", "У вас уже максимальное здоровье и мана!")
                return False
        
        # Удаляем расходник из инвентаря
        inventory = self.player_data.get("inventory", [])
        
        if isinstance(item_id, dict):
            # Это объект предмета из лута
            item_key = item_id.get("id")
            self.player_data["inventory"] = [
                item for item in inventory 
                if not (isinstance(item, dict) and item.get("id") == item_key)
            ]
        else:
            # Это ID предмета
            if item_id in inventory:
                inventory.remove(item_id)
                self.player_data["inventory"] = inventory
        
        # Сохраняем изменения
        self.save_current_player()
        
        # Обновляем UI
        self.update_health_display()
        self.update_mana_display()
        
        if self.sidebar_open:
            self.update_sidebar_stats()
        
        # Обновляем интерфейс
        if self.current_screen == "inventory":
            self.show_inventory()
        
        return True

    def calculate_weight(self, item_ids_or_objects):
        items = self.load_items()
        total_weight = 0
        
        for item in item_ids_or_objects:
            if isinstance(item, dict):
                # Это объект предмета из лута
                total_weight += item.get("weight", 0)
            else:
                # Это ID предмета
                item_data = items.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        return total_weight

    def calculate_inventory_weight(self, items):
        """Рассчитать вес инвентаря (БЕЗ экипированных предметов)"""
        total_weight = 0
        items_db = self.load_items()
        
        # Получаем ID всех экипированных предметов
        equipped_ids = set()
        equipped_items = self.player_data.get("equipped", {})
        
        for slot, item in equipped_items.items():
            if isinstance(item, dict):
                if "id" in item:
                    equipped_ids.add(item["id"])
            else:
                equipped_ids.add(item)
        
        for item in items:
            # Пропускаем экипированные предметы
            if isinstance(item, dict):
                item_id = item.get("id")
                if item_id and item_id in equipped_ids:
                    continue
                total_weight += item.get("weight", 0)
            else:
                if item in equipped_ids:
                    continue
                item_data = items_db.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        return total_weight
    
    def calculate_chest_weight(self):
        """Рассчитать вес сундука (все предметы в сундуке)"""
        total_weight = 0
        items_db = self.load_items()
        
        for item in self.chest_items:
            if isinstance(item, dict):
                total_weight += item.get("weight", 0)
            else:
                item_data = items_db.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        return total_weight
    
    def calculate_total_item_weight(self, items):
        """Рассчитать вес любых предметов (полный вес без исключений)"""
        total_weight = 0
        items_db = self.load_items()
        
        for item in items:
            if isinstance(item, dict):
                total_weight += item.get("weight", 0)
            else:
                item_data = items_db.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        return total_weight

    def calculate_full_inventory_weight(self):
        """Рассчитать полный вес инвентаря (включая экипированные предметы)"""
        total_weight = self.calculate_weight(self.player_data.get("inventory", []))
        
        # Добавляем вес экипированных предметов
        equipped = self.player_data.get("equipped", {})
        items_db = self.load_items()
        
        for slot, item in equipped.items():
            if isinstance(item, dict):
                # Это объект предмета из лута
                total_weight += item.get("weight", 0)
            else:
                # Это ID предмета
                item_data = items_db.get(item, {})
                total_weight += item_data.get("weight", 0)
        
        return total_weight
    
    def get_current_bag_capacity(self):
        """Получить текущую вместимость сумки на основе уровня"""
        current_level = self.player_data.get("level", 1)
        # Базовая вместимость + прибавка за уровень
        capacity = self.base_bag_capacity + (self.bag_capacity_per_level * (current_level - 1))
        return min(capacity, self.max_bag_capacity)
    
    def get_bag_capacity_for_level(self, level):
        """Получить вместимость сумки для указанного уровня"""
        capacity = self.base_bag_capacity + (level - 1) * self.bag_capacity_per_level
        return min(capacity, self.max_bag_capacity)
    
    def get_chest_capacity(self):
        """Получить вместимость сундука"""
        return self.chest_capacity

    def open_monsters_editor(self, location=None):
        """Редактор монстров в указанной или текущей локации"""
        if not self.is_admin():
            messagebox.showinfo("Доступ запрещен", "Эта функция доступна только администратору.")
            return
        
        # Если локация не указана, используем текущую
        if location is None:
            location = self.current_location
        
        # Проверяем, существует ли локация
        if location not in self.config["locations"]:
            messagebox.showerror("Ошибка", f"Локация '{location}' не найдена!")
            return
            
        # Теперь используем переменную location в остальной части метода
        dialog = tk.Toplevel(self.root)
        dialog.title(f"🛠 Редактор монстров - {location}")
        dialog.geometry("850x600")  # Увеличили ширину для ID
        dialog.configure(bg="#1a1a2e")
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#0f3460", height=60)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text=f"🛠 РЕДАКТОР МОНСТРОВ - {location}", font=("Arial", 16, "bold"),
                bg="#0f3460", fg="white").pack(pady=15)
        
        # Информация о локации
        info_frame = tk.Frame(dialog, bg="#16213e", padx=10, pady=5)
        info_frame.pack(fill="x", padx=10, pady=5)
        
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        tk.Label(info_frame, text=f"📍 Локация: {loc_cfg.get('title', location)}", 
                font=("Arial", 10, "bold"), bg="#16213e", fg="#4CC9F0").pack(side="left")
        
        monsters_count = len(monsters_data)
        tk.Label(info_frame, text=f"👹 Монстров: {monsters_count}/5", 
                font=("Arial", 10, "bold"), bg="#16213e", fg="#F72585").pack(side="right")
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#1a1a2e")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#1a1a2e", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#1a1a2e")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Контейнер для карточек монстров
        monsters_container = tk.Frame(scrollable_frame, bg="#1a1a2e")
        monsters_container.pack(fill="both", expand=True)
        
        # Если нет монстров
        if not monsters_data:
            empty_frame = tk.Frame(monsters_container, bg="#1a1a2e", height=150)
            empty_frame.pack(fill="both", expand=True, pady=30)
            
            tk.Label(empty_frame, text="👻", font=("Arial", 40), 
                    bg="#1a1a2e", fg="#4CC9F0").pack(pady=10)
            tk.Label(empty_frame, text="Нет монстров в этой локации", font=("Arial", 14, "bold"), 
                    bg="#1a1a2e", fg="white").pack(pady=5)
            tk.Label(empty_frame, text="Нажмите 'Добавить монстра' чтобы создать первого", 
                    font=("Arial", 9), bg="#1a1a2e", fg="#BCAAA4").pack()
        else:
            # Отображаем существующих монстров
            for i, monster_data in enumerate(monsters_data):
                monster = Monster.from_dict(monster_data)
                if not monster:
                    continue
                    
                self.create_monster_editor_card(monsters_container, monster, i, dialog)
        
        # Панель управления
        control_frame = tk.Frame(dialog, bg="#0f3460", height=70)
        control_frame.pack(fill="x", side="bottom", pady=(10, 0))
        
        btn_container = tk.Frame(control_frame, bg="#0f3460", pady=15)
        btn_container.pack()
        
        # Кнопка добавления нового монстра
        add_btn = tk.Button(btn_container, text="➕ Добавить монстра", font=("Arial", 11, "bold"),
                          bg="#4CAF50", fg="white", width=20, height=2,
                          command=lambda: self.add_new_monster_dialog(dialog),
                          state="normal" if len(monsters_data) < 5 else "disabled")
        add_btn.pack(side="left", padx=5)
        
        # Кнопка сохранения и закрытия
        save_btn = tk.Button(btn_container, text="💾 Сохранить", font=("Arial", 11, "bold"),
                   bg="#2196F3", fg="white", width=15, height=2,
                   command=lambda: self.save_monsters_editor(dialog))  # Убрали location
        save_btn.pack(side="left", padx=5)
        
        # Кнопка закрытия
        close_btn = tk.Button(btn_container, text="❌ Закрыть", font=("Arial", 11, "bold"),
                            bg="#f44336", fg="white", width=15, height=2,
                            command=dialog.destroy)
        close_btn.pack(side="left", padx=5)
        
        # Функция для колесика мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')
    
    def create_monster_editor_card(self, parent, monster, index, dialog):
        """Создать карточку для редактирования монстра"""
        card_frame = tk.Frame(parent, bg="#16213e", relief="ridge", bd=2, padx=15, pady=15)
        card_frame.pack(fill="x", pady=8)
        
        # Заголовок карточки
        header_frame = tk.Frame(card_frame, bg="#16213e")
        header_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(header_frame, text=f"👹 МОНСТР #{index + 1}", font=("Arial", 12, "bold"),
                bg="#16213e", fg="#F72585").pack(side="left")
        
        # Статус монстра
        status_text = "🟢 Жив" if monster.is_alive else "🔴 Мертв"
        status_color = "#4CAF50" if monster.is_alive else "#f44336"
        tk.Label(header_frame, text=status_text, font=("Arial", 10, "bold"),
                bg=status_color, fg="white", padx=5, pady=2).pack(side="right")
        
        # Основные характеристики
        main_frame = tk.Frame(card_frame, bg="#16213e")
        main_frame.pack(fill="x")
        
        # Левая колонка - основные параметры
        left_frame = tk.Frame(main_frame, bg="#16213e", width=400)
        left_frame.pack(side="left", fill="both", expand=True)
        
        # ИД монстра (только чтение)
        id_frame = tk.Frame(left_frame, bg="#16213e")
        id_frame.pack(fill="x", pady=2)
        
        tk.Label(id_frame, text="ID монстра:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#FFD700", width=15, anchor="w").pack(side="left")
        
        # Проверяем, есть ли ID у монстра, если нет - генерируем
        if not hasattr(monster, 'id') or not monster.id:
            monster.id = monster.generate_id(monster.name)
        
        id_var = tk.StringVar(value=monster.id)
        id_label = tk.Label(id_frame, text=monster.id[:20] + "..." if len(monster.id) > 20 else monster.id,
                           font=("Arial", 9), bg="#333", fg="#FFD700", padx=5, pady=2, 
                           width=30, anchor="w", relief="sunken", bd=1)
        id_label.pack(side="left", padx=(5, 0))
        
        # Кнопка копирования ID
        copy_id_btn = tk.Button(id_frame, text="📋", font=("Arial", 8),
                              bg="#4CAF50", fg="white", width=2,
                              command=lambda: self.copy_to_clipboard(monster.id))
        copy_id_btn.pack(side="left", padx=5)
        
        # Название монстра
        name_frame = tk.Frame(left_frame, bg="#16213e")
        name_frame.pack(fill="x", pady=2)
        
        tk.Label(name_frame, text="Название:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        name_var = tk.StringVar(value=monster.name)
        name_entry = tk.Entry(name_frame, textvariable=name_var, 
                             font=("Arial", 10), width=25, bg="white", fg="#333")
        name_entry.pack(side="left")
        
        # Иконка
        icon_frame = tk.Frame(left_frame, bg="#16213e")
        icon_frame.pack(fill="x", pady=2)
        
        tk.Label(icon_frame, text="Иконка:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        icon_var = tk.StringVar(value=monster.icon)
        icon_entry = tk.Entry(icon_frame, textvariable=icon_var, 
                             font=("Arial", 10), width=25, bg="white", fg="#333")
        icon_entry.pack(side="left")
        
        # Здоровье
        hp_frame = tk.Frame(left_frame, bg="#16213e")
        hp_frame.pack(fill="x", pady=2)
        
        tk.Label(hp_frame, text="Здоровье (HP):", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        hp_min_frame = tk.Frame(hp_frame, bg="#16213e")
        hp_min_frame.pack(side="left", padx=2)
        
        tk.Label(hp_min_frame, text="Текущее:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        hp_var = tk.IntVar(value=monster.hp)
        hp_spinbox = tk.Spinbox(hp_min_frame, from_=1, to=1000, textvariable=hp_var,
                               font=("Arial", 10), width=8, bg="white", fg="#333")
        hp_spinbox.pack()
        
        hp_max_frame = tk.Frame(hp_frame, bg="#16213e")
        hp_max_frame.pack(side="left", padx=2)
        
        tk.Label(hp_max_frame, text="Макс.:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        hp_max_var = tk.IntVar(value=monster.hp_max)
        hp_max_spinbox = tk.Spinbox(hp_max_frame, from_=1, to=1000, textvariable=hp_max_var,
                                   font=("Arial", 10), width=8, bg="white", fg="#333")
        hp_max_spinbox.pack()
        
        # Урон
        dmg_frame = tk.Frame(left_frame, bg="#16213e")
        dmg_frame.pack(fill="x", pady=2)
        
        tk.Label(dmg_frame, text="Урон:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        dmg_min_frame = tk.Frame(dmg_frame, bg="#16213e")
        dmg_min_frame.pack(side="left", padx=2)
        
        tk.Label(dmg_min_frame, text="Мин.:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        dmg_min_var = tk.IntVar(value=monster.min_dmg)
        dmg_min_spinbox = tk.Spinbox(dmg_min_frame, from_=1, to=100, textvariable=dmg_min_var,
                                    font=("Arial", 10), width=8, bg="white", fg="#333")
        dmg_min_spinbox.pack()
        
        dmg_max_frame = tk.Frame(dmg_frame, bg="#16213e")
        dmg_max_frame.pack(side="left", padx=2)
        
        tk.Label(dmg_max_frame, text="Макс.:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        dmg_max_var = tk.IntVar(value=monster.max_dmg)
        dmg_max_spinbox = tk.Spinbox(dmg_max_frame, from_=1, to=100, textvariable=dmg_max_var,
                                    font=("Arial", 10), width=8, bg="white", fg="#333")
        dmg_max_spinbox.pack()
        
        # Опыт за убийство
        exp_frame = tk.Frame(left_frame, bg="#16213e")
        exp_frame.pack(fill="x", pady=2)
        
        tk.Label(exp_frame, text="Опыт за убийство:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        exp_var = tk.IntVar(value=monster.exp_reward)
        exp_spinbox = tk.Spinbox(exp_frame, from_=1, to=1000, textvariable=exp_var,
                                font=("Arial", 10), width=12, bg="white", fg="#333")
        exp_spinbox.pack(side="left")
        
        # Время возрождения
        respawn_frame = tk.Frame(left_frame, bg="#16213e")
        respawn_frame.pack(fill="x", pady=2)
        
        tk.Label(respawn_frame, text="Возрождение (сек):", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        respawn_var = tk.IntVar(value=monster.default_respawn_time)
        respawn_spinbox = tk.Spinbox(respawn_frame, from_=5, to=300, textvariable=respawn_var,
                                    font=("Arial", 10), width=12, bg="white", fg="#333")
        respawn_spinbox.pack(side="left")
        
        # Позиция
        pos_frame = tk.Frame(left_frame, bg="#16213e")
        pos_frame.pack(fill="x", pady=2)
        
        tk.Label(pos_frame, text="Позиция (X, Y):", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        x_frame = tk.Frame(pos_frame, bg="#16213e")
        x_frame.pack(side="left", padx=2)
        
        tk.Label(x_frame, text="X:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        x_var = tk.IntVar(value=monster.x)
        x_spinbox = tk.Spinbox(x_frame, from_=0, to=600, textvariable=x_var,
                              font=("Arial", 10), width=6, bg="white", fg="#333")
        x_spinbox.pack()
        
        y_frame = tk.Frame(pos_frame, bg="#16213e")
        y_frame.pack(side="left", padx=2)
        
        tk.Label(y_frame, text="Y:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        y_var = tk.IntVar(value=monster.y)
        y_spinbox = tk.Spinbox(y_frame, from_=0, to=450, textvariable=y_var,
                              font=("Arial", 10), width=6, bg="white", fg="#333")
        y_spinbox.pack()

        # Размеры фрейма
        size_frame = tk.Frame(left_frame, bg="#16213e")
        size_frame.pack(fill="x", pady=2)
        
        tk.Label(size_frame, text="Размеры фрейма:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#FFD700", width=15, anchor="w").pack(side="left")
        
        width_frame = tk.Frame(size_frame, bg="#16213e")
        width_frame.pack(side="left", padx=2)
        
        tk.Label(width_frame, text="Ширина:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        
        frame_width_value = monster.frame_width if hasattr(monster, 'frame_width') else 120
        frame_width_var = tk.IntVar(value=frame_width_value)
        frame_width_spinbox = tk.Spinbox(width_frame, from_=80, to=300, textvariable=frame_width_var,
                                        font=("Arial", 10), width=6, bg="white", fg="#333")
        frame_width_spinbox.pack()
        
        height_frame = tk.Frame(size_frame, bg="#16213e")
        height_frame.pack(side="left", padx=2)
        
        tk.Label(height_frame, text="Высота:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        
        frame_height_value = monster.frame_height if hasattr(monster, 'frame_height') else 90
        frame_height_var = tk.IntVar(value=frame_height_value)
        frame_height_spinbox = tk.Spinbox(height_frame, from_=60, to=250, textvariable=frame_height_var,
                                         font=("Arial", 10), width=6, bg="white", fg="#333")
        frame_height_spinbox.pack()
        
        # Информация о текущем размере
        size_info_frame = tk.Frame(left_frame, bg="#16213e")
        size_info_frame.pack(fill="x", pady=(0, 10))
        
        current_width = monster.frame_width if hasattr(monster, 'frame_width') else 120
        current_height = monster.frame_height if hasattr(monster, 'frame_height') else 90
        
        tk.Label(size_info_frame, text=f"Текущий размер: {current_width} x {current_height} пикселей", 
                font=("Arial", 8), bg="#16213e", fg="#FFD700").pack(anchor="w")
        
        # Правая колонка - кнопки управления и лута
        right_frame = tk.Frame(main_frame, bg="#16213e", width=200)
        right_frame.pack(side="right", fill="y")
        
        # Кнопки управления
        btn_frame = tk.Frame(right_frame, bg="#16213e")
        btn_frame.pack(pady=(0, 10))
        
        # Сохранить изменения этого монстра
        save_monster_btn = tk.Button(btn_frame, text="💾 Сохранить", font=("Arial", 9, "bold"),
                                   bg="#4CAF50", fg="white", width=15,
                                   command=lambda idx=index, idv=id_var, nv=name_var, iv=icon_var, 
                                   hv=hp_var, hmv=hp_max_var, dmv=dmg_min_var, 
                                   dmxv=dmg_max_var, ev=exp_var, rv=respawn_var,
                                   xv=x_var, yv=y_var, fwv=frame_width_var, fhv=frame_height_var: 
                                   self.update_monster_data(idx, idv, nv, iv, hv, hmv, dmv, dmxv, 
                                                           ev, rv, xv, yv, fwv, fhv, dialog))
        save_monster_btn.pack(pady=2)
        
        # Удалить монстра
        delete_btn = tk.Button(btn_frame, text="🗑 Удалить", font=("Arial", 9, "bold"),
                             bg="#f44336", fg="white", width=15,
                             command=lambda idx=index: self.delete_monster_dialog(idx, dialog))
        delete_btn.pack(pady=2)
        
        # Воскресить монстра
        respawn_btn = tk.Button(btn_frame, text="⚡ Воскресить", font=("Arial", 9, "bold"),
                              bg="#2196F3", fg="white", width=15,
                              command=lambda idx=index: self.respawn_monster_editor(idx, dialog))
        respawn_btn.pack(pady=2)
        
        # Редактор лута
        loot_btn = tk.Button(btn_frame, text="📦 Лут", font=("Arial", 9, "bold"),
                           bg="#FF9800", fg="white", width=15,
                           command=lambda idx=index: self.open_monster_loot_editor(idx, dialog))
        loot_btn.pack(pady=2)
        
        # Предпросмотр монстра
        preview_frame = tk.Frame(right_frame, bg="#16213e")
        preview_frame.pack(pady=10)
        
        tk.Label(preview_frame, text="Предпросмотр:", font=("Arial", 9, "bold"),
                bg="#16213e", fg="#FFD54F").pack()
        
        preview_label = tk.Label(preview_frame, text=monster.icon, font=("Arial", 24),
                                bg="#16213e", fg="white")
        preview_label.pack(pady=5)
        
        # Обновление предпросмотра при изменении иконки
        def update_preview(*args):
            preview_label.config(text=icon_var.get())
        
        icon_var.trace("w", update_preview)
    
    def update_monster_data(self, index, id_var, name_var, icon_var, hp_var, hp_max_var, 
                          dmg_min_var, dmg_max_var, exp_var, respawn_var,
                          x_var, y_var, frame_width_var, frame_height_var, dialog):
        """Обновить данные монстра"""
        location = self.current_location
        
        if not location or location not in self.config["locations"]:
            messagebox.showerror("Ошибка", "Локация не найдена!")
            return
        
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if index >= len(monsters_data):
            messagebox.showerror("Ошибка", "Монстр не найден!")
            return
        
        # Получаем текущего монстра
        current_monster = Monster.from_dict(monsters_data[index])
        
        # Обновляем данные
        current_monster.name = name_var.get()
        current_monster.icon = icon_var.get()
        current_monster.hp = hp_var.get()
        current_monster.hp_max = hp_max_var.get()
        current_monster.min_dmg = dmg_min_var.get()
        current_monster.max_dmg = dmg_max_var.get()
        current_monster.x = x_var.get()
        current_monster.y = y_var.get()
        
        # Обновляем ID только если он пустой
        new_id = id_var.get().strip()
        if new_id and new_id != current_monster.id:
            # Проверяем уникальность ID
            id_exists = False
            for i, monster_data in enumerate(monsters_data):
                if i != index and isinstance(monster_data, dict) and monster_data.get("id") == new_id:
                    id_exists = True
                    break
            
            if not id_exists:
                current_monster.id = new_id
            else:
                messagebox.showwarning("⚠️ ID уже существует", 
                                      f"ID '{new_id}' уже используется другим монстром. ID не изменен.",
                                      parent=dialog)
        
        # Обновляем размеры фрейма
        current_monster.frame_width = frame_width_var.get()
        current_monster.frame_height = frame_height_var.get()
        
        # Опыт (вычисляем или берем из поля)
        exp_value = exp_var.get()
        if exp_value > 0:
            current_monster.exp_reward = exp_value
        else:
            current_monster.exp_reward = current_monster.calculate_default_exp()
        
        # Время возрождения
        current_monster.default_respawn_time = respawn_var.get()
        
        # Сохраняем обновленного монстра
        monsters_data[index] = current_monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][location] = loc_cfg
        save_config(self.config)
        
        # Показываем сообщение
        self.show_animated_message(f"Монстр {current_monster.name} (ID: {current_monster.id}) обновлен!", "#4CAF50", 1500)
        
        # Обновляем редактор
        dialog.destroy()
        self.open_monsters_editor(location)

    def copy_to_clipboard(self, text):
        """Скопировать текст в буфер обмена"""
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.show_animated_message("ID скопирован в буфер обмена", "#2196F3", 1000)
    
    def add_new_monster_dialog(self, dialog):
        """Диалог добавления нового монстра"""
        # Получаем локацию из атрибута класса
        location = self.current_location
        
        # Проверяем, что локация существует
        if not location or location not in self.config["locations"]:
            messagebox.showerror("Ошибка", "Локация не найдена!", parent=dialog)
            return
            
        add_dialog = tk.Toplevel(dialog)
        add_dialog.title(f"➕ Добавить нового монстра - {location}")
        add_dialog.geometry("500x500")
        add_dialog.configure(bg="#1a1a2e")
        add_dialog.transient(dialog)
        add_dialog.grab_set()
        
        # Заголовок
        tk.Label(add_dialog, text="➕ СОЗДАНИЕ НОВОГО МОНСТРА", 
                font=("Arial", 14, "bold"), bg="#0f3460", fg="white",
                padx=10, pady=10).pack(fill="x")
        
        # Форма
        form_frame = tk.Frame(add_dialog, bg="#1a1a2e", padx=20, pady=20)
        form_frame.pack(fill="both", expand=True)
        
        # ID монстра
        tk.Label(form_frame, text="ID монстра (уникальный):", 
                font=("Arial", 10, "bold"), bg="#1a1a2e", fg="#FFD700").pack(anchor="w", pady=(0, 5))
        
        id_var = tk.StringVar()
        id_entry = tk.Entry(form_frame, textvariable=id_var, 
                           font=("Arial", 10), width=40, bg="white", fg="#333")
        id_entry.pack(pady=(0, 15))
        
        # Кнопка генерации ID
        def generate_id():
            timestamp = int(time.time() * 1000)
            random_suffix = random.randint(1000, 9999)
            generated_id = f"monster_{timestamp}_{random_suffix}"
            id_var.set(generated_id)
        
        tk.Button(form_frame, text="🎲 Сгенерировать ID", font=("Arial", 9),
                 bg="#4CAF50", fg="white", command=generate_id).pack(pady=(0, 15))
        
        # Название монстра
        tk.Label(form_frame, text="Название монстра:", 
                font=("Arial", 10, "bold"), bg="#1a1a2e", fg="#4CC9F0").pack(anchor="w", pady=(0, 5))
        
        name_var = tk.StringVar(value="Новый монстр")
        name_entry = tk.Entry(form_frame, textvariable=name_var, 
                             font=("Arial", 10), width=40, bg="white", fg="#333")
        name_entry.pack(pady=(0, 15))
        
        # Иконка
        tk.Label(form_frame, text="Иконка (эмодзи):", 
                font=("Arial", 10, "bold"), bg="#1a1a2e", fg="#4CC9F0").pack(anchor="w", pady=(0, 5))
        
        icon_var = tk.StringVar(value="👹")
        icon_entry = tk.Entry(form_frame, textvariable=icon_var, 
                             font=("Arial", 10), width=40, bg="white", fg="#333")
        icon_entry.pack(pady=(0, 15))
        
        # Кнопки
        btn_frame = tk.Frame(form_frame, bg="#1a1a2e", pady=20)
        btn_frame.pack(fill="x")

        def create_monster():
            monster_id = id_var.get().strip()
            monster_name = name_var.get().strip()
            monster_icon = icon_var.get().strip()
            
            if not monster_id:
                messagebox.showerror("Ошибка", "Введите ID монстра!", parent=add_dialog)
                return
            
            if not monster_name:
                messagebox.showerror("Ошибка", "Введите название монстра!", parent=add_dialog)
                return
            
            # Проверяем уникальность ID
            loc_cfg = self.config["locations"].get(location, {})
            monsters_data = loc_cfg.get("monsters", [])
            
            for monster_data in monsters_data:
                if isinstance(monster_data, dict) and monster_data.get("id") == monster_id:
                    messagebox.showerror("Ошибка", f"Монстр с ID '{monster_id}' уже существует!", parent=add_dialog)
                    return
            
            # Создаем нового монстра
            new_monster = Monster(
                id=monster_id,
                name=monster_name,
                icon=monster_icon,
                hp=50,
                hp_max=50,
                min_dmg=5,
                max_dmg=10,
                x=400,
                y=100
            )
            
            # Добавляем монстра в локацию
            monsters_data.append(new_monster.to_dict())
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            
            messagebox.showinfo("✅ Успешно", 
                              f"Монстр '{monster_name}' (ID: {monster_id}) создан!",
                              parent=add_dialog)
            
            add_dialog.destroy()
            dialog.destroy()
            self.open_monsters_editor(location)
        
        tk.Button(btn_frame, text="✅ Создать", font=("Arial", 11, "bold"),
                 bg="#4CAF50", fg="white", width=15, command=create_monster).pack(side="left", padx=5)
        
        tk.Button(btn_frame, text="❌ Отмена", font=("Arial", 11),
                 bg="#f44336", fg="white", width=15, command=add_dialog.destroy).pack(side="right", padx=5)
        
        # Центрируем окно
        add_dialog.update_idletasks()
        width = add_dialog.winfo_width()
        height = add_dialog.winfo_height()
        x = (dialog.winfo_screenwidth() // 2) - (width // 2)
        y = (dialog.winfo_screenheight() // 2) - (height // 2)
        add_dialog.geometry(f'{width}x{height}+{x}+{y}')
    
    def delete_monster_dialog(self, index, dialog):
        """Удалить монстра"""
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if index >= len(monsters_data):
            return
        
        monster_data = monsters_data[index]
        monster = Monster.from_dict(monster_data)
        
        response = messagebox.askyesno("🗑 Удаление монстра", 
                                      f"Вы уверены, что хотите удалить монстра '{monster.name}'?\n\nЭто действие нельзя отменить!", 
                                      parent=dialog)
        
        if response:
            monsters_data.pop(index)
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][self.current_location] = loc_cfg
            save_config(self.config)
            
            messagebox.showinfo("✅ Удалено", f"Монстр '{monster.name}' удален!", parent=dialog)
            
            # Перезагружаем редактор
            dialog.destroy()
            self.open_monsters_editor(self.current_location)
    
    def respawn_monster_editor(self, index, dialog):
        """Воскресить монстра в редакторе"""
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if index >= len(monsters_data):
            return
        
        monster_data = monsters_data[index]
        monster = Monster.from_dict(monster_data)
        
        monster.is_alive = True
        monster.hp = monster.hp_max
        monster.respawn_time = None
        
        monsters_data[index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        messagebox.showinfo("⚡ Воскрешение", f"Монстр '{monster.name}' воскрешен!", parent=dialog)
        
        # Перезагружаем редактор
        dialog.destroy()
        self.open_monsters_editor(self.current_location)
    
    def add_new_monster_dialog(self, parent_dialog):
        """Диалог добавления нового монстра"""
        dialog = tk.Toplevel(parent_dialog)
        dialog.title("➕ Добавить нового монстра")
        dialog.geometry("500x600")
        dialog.configure(bg="#1a1a2e")
        dialog.transient(parent_dialog)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#0f3460", height=50)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text="➕ ДОБАВЛЕНИЕ НОВОГО МОНСТРА", font=("Arial", 12, "bold"),
                bg="#0f3460", fg="white").pack(pady=10)
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#1a1a2e")
        main_container.pack(fill="both", expand=True, padx=15, pady=15)
        
        canvas = tk.Canvas(main_container, bg="#1a1a2e", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#1a1a2e")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # Форма создания монстра
        form_frame = tk.Frame(scrollable_frame, bg="#1a1a2e")
        form_frame.pack(fill="both", expand=True)
        
        # Шаблоны монстров
        templates_frame = tk.Frame(form_frame, bg="#16213e", relief="ridge", bd=2, padx=10, pady=10)
        templates_frame.pack(fill="x", pady=(0, 15))
        
        tk.Label(templates_frame, text="🎯 ШАБЛОНЫ МОНСТРОВ", font=("Arial", 11, "bold"),
                bg="#16213e", fg="#FFD54F").pack(anchor="w", pady=(0, 10))
        
        templates = [
            ("🐺 Волк", "Волк", "🐺", 10, 10, 2, 4, 20, 15, 120, 90),
            ("🐗 Кабан", "Кабан", "🐗", 15, 15, 3, 6, 30, 20, 130, 100),
            ("🐻 Медведь", "Медведь", "🐻", 25, 25, 5, 8, 50, 25, 140, 110),
            ("🦊 Лиса", "Лиса", "🦊", 8, 8, 1, 3, 15, 10, 110, 85),
            ("🐺 Альфа-волк", "Альфа-волк", "🐺", 30, 30, 6, 10, 75, 30, 150, 120),
            ("👹 Гоблин", "Гоблин", "👹", 12, 12, 2, 5, 25, 18, 125, 95),
            ("🧟 Зомби", "Зомби", "🧟", 20, 20, 3, 7, 35, 22, 135, 105),
            ("🕷️ Паук", "Гигантский паук", "🕷️", 18, 18, 4, 6, 40, 20, 140, 100)
        ]
        
        # Контейнер для кнопок шаблонов
        templates_grid = tk.Frame(templates_frame, bg="#16213e")
        templates_grid.pack(fill="x")
        
        row_frame = None
        for i, (text, name, icon, hp, hp_max, dmg_min, dmg_max, exp, respawn, width, height) in enumerate(templates):
            if i % 2 == 0:
                row_frame = tk.Frame(templates_grid, bg="#16213e")
                row_frame.pack(fill="x", pady=2)
            
            btn = tk.Button(row_frame, text=text, font=("Arial", 9),
                          bg="#7B1FA2", fg="white", width=25,
                          command=lambda n=name, ic=icon, h=hp, hm=hp_max, 
                          dmin=dmg_min, dmax=dmg_max, e=exp, r=respawn,
                          w=width, hgt=height:  # <-- Добавляем параметры размеров
                          self.fill_monster_form(n, ic, h, hm, dmin, dmax, e, r, w, hgt,  # <-- Передаем их
                                               name_var, icon_var, hp_var, hp_max_var, 
                                               dmg_min_var, dmg_max_var, exp_var, respawn_var,
                                               frame_width_var, frame_height_var))  # <-- И переменные для размеров
            btn.pack(side="left", fill="x", expand=True, padx=2, pady=2)
        
        # Поля формы
        fields_frame = tk.Frame(form_frame, bg="#16213e", relief="ridge", bd=2, padx=10, pady=10)
        fields_frame.pack(fill="x")
        
        tk.Label(fields_frame, text="📝 ПАРАМЕТРЫ МОНСТРА", font=("Arial", 11, "bold"),
                bg="#16213e", fg="#FFD54F").pack(anchor="w", pady=(0, 10))
        
        # Название
        name_frame = tk.Frame(fields_frame, bg="#16213e")
        name_frame.pack(fill="x", pady=2)
        
        tk.Label(name_frame, text="Название:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        name_var = tk.StringVar(value="Новый монстр")
        tk.Entry(name_frame, textvariable=name_var, 
                font=("Arial", 10), width=30, bg="white", fg="#333").pack(side="left")
        
        # Иконка
        icon_frame = tk.Frame(fields_frame, bg="#16213e")
        icon_frame.pack(fill="x", pady=2)
        
        tk.Label(icon_frame, text="Иконка:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        icon_var = tk.StringVar(value="👹")
        tk.Entry(icon_frame, textvariable=icon_var, 
                font=("Arial", 10), width=30, bg="white", fg="#333").pack(side="left")
        
        # Здоровье
        hp_frame = tk.Frame(fields_frame, bg="#16213e")
        hp_frame.pack(fill="x", pady=2)
        
        tk.Label(hp_frame, text="Здоровье:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        hp_min_frame = tk.Frame(hp_frame, bg="#16213e")
        hp_min_frame.pack(side="left", padx=2)
        
        tk.Label(hp_min_frame, text="Текущее:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        hp_var = tk.IntVar(value=10)
        tk.Spinbox(hp_min_frame, from_=1, to=1000, textvariable=hp_var,
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        hp_max_frame = tk.Frame(hp_frame, bg="#16213e")
        hp_max_frame.pack(side="left", padx=2)
        
        tk.Label(hp_max_frame, text="Макс.:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        hp_max_var = tk.IntVar(value=10)
        tk.Spinbox(hp_max_frame, from_=1, to=1000, textvariable=hp_max_var,
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Урон
        dmg_frame = tk.Frame(fields_frame, bg="#16213e")
        dmg_frame.pack(fill="x", pady=2)
        
        tk.Label(dmg_frame, text="Урон:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        dmg_min_frame = tk.Frame(dmg_frame, bg="#16213e")
        dmg_min_frame.pack(side="left", padx=2)
        
        tk.Label(dmg_min_frame, text="Мин.:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        dmg_min_var = tk.IntVar(value=2)
        tk.Spinbox(dmg_min_frame, from_=1, to=100, textvariable=dmg_min_var,
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        dmg_max_frame = tk.Frame(dmg_frame, bg="#16213e")
        dmg_max_frame.pack(side="left", padx=2)
        
        tk.Label(dmg_max_frame, text="Макс.:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        dmg_max_var = tk.IntVar(value=4)
        tk.Spinbox(dmg_max_frame, from_=1, to=100, textvariable=dmg_max_var,
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Опыт
        exp_frame = tk.Frame(fields_frame, bg="#16213e")
        exp_frame.pack(fill="x", pady=2)
        
        tk.Label(exp_frame, text="Опыт за убийство:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        exp_var = tk.IntVar(value=20)
        tk.Spinbox(exp_frame, from_=1, to=1000, textvariable=exp_var,
                  font=("Arial", 10), width=12, bg="white", fg="#333").pack(side="left")
        
        # Время возрождения
        respawn_frame = tk.Frame(fields_frame, bg="#16213e")
        respawn_frame.pack(fill="x", pady=2)
        
        tk.Label(respawn_frame, text="Возрождение (сек):", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#4CC9F0", width=15, anchor="w").pack(side="left")
        
        respawn_var = tk.IntVar(value=15)
        tk.Spinbox(respawn_frame, from_=5, to=300, textvariable=respawn_var,
                  font=("Arial", 10), width=12, bg="white", fg="#333").pack(side="left")
        
        # Размеры фрейма
        size_frame = tk.Frame(fields_frame, bg="#16213e")
        size_frame.pack(fill="x", pady=2)
        
        tk.Label(size_frame, text="Размеры фрейма:", font=("Arial", 10, "bold"),
                bg="#16213e", fg="#FFD700", width=15, anchor="w").pack(side="left")
        
        # Ширина фрейма
        width_frame = tk.Frame(size_frame, bg="#16213e")
        width_frame.pack(side="left", padx=2)
        
        tk.Label(width_frame, text="Ширина:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        
        frame_width_var = tk.IntVar(value=120)  # Значение по умолчанию
        tk.Spinbox(width_frame, from_=80, to=300, textvariable=frame_width_var,
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Высота фрейма
        height_frame = tk.Frame(size_frame, bg="#16213e")
        height_frame.pack(side="left", padx=2)
        
        tk.Label(height_frame, text="Высота:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        
        frame_height_var = tk.IntVar(value=90)  # Значение по умолчанию
        tk.Spinbox(height_frame, from_=60, to=250, textvariable=frame_height_var,
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Информация о размере
        size_info_frame = tk.Frame(fields_frame, bg="#16213e")
        size_info_frame.pack(fill="x", pady=(0, 10))
        
        tk.Label(size_info_frame, text="Размер фрейма монстра и таймера возрождения", 
                font=("Arial", 8), bg="#16213e", fg="#FFD700").pack(anchor="w")

        # Позиция (автоматическая)
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        # Автоматически рассчитываем позицию для нового монстра
        base_x = 400
        base_y = 120
        spacing_x = 120
        
        new_index = len(monsters_data)
        row = new_index // 2
        col = new_index % 2
        
        auto_x = base_x + (col * spacing_x)
        auto_y = base_y + (row * 100)
        
        # Кнопки
        buttons_frame = tk.Frame(dialog, bg="#0f3460", height=70)
        buttons_frame.pack(fill="x", side="bottom", pady=(10, 0))
        
        btn_container = tk.Frame(buttons_frame, bg="#0f3460", pady=15)
        btn_container.pack()
        
        # Кнопка создания
        create_btn = tk.Button(btn_container, text="✅ Создать монстра", font=("Arial", 11, "bold"),
                             bg="#4CAF50", fg="white", width=20, height=2,
                             command=lambda: self.create_new_monster(
                                 name_var.get(), icon_var.get(), 
                                 hp_var.get(), hp_max_var.get(),
                                 dmg_min_var.get(), dmg_max_var.get(),
                                 exp_var.get(), respawn_var.get(),
                                 auto_x, auto_y, 
                                 frame_width_var.get(), frame_height_var.get(),  # <-- Добавляем размеры
                                 dialog, parent_dialog))  # <-- Теперь 14 параметров
        create_btn.pack(side="left", padx=5)
        
        # Кнопка отмены
        cancel_btn = tk.Button(btn_container, text="❌ Отмена", font=("Arial", 11, "bold"),
                              bg="#f44336", fg="white", width=15, height=2,
                              command=dialog.destroy)
        cancel_btn.pack(side="left", padx=5)
        
        # Функция для колесика мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (parent_dialog.winfo_screenwidth() // 2) - (width // 2)
        y = (parent_dialog.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')
    
    def fill_monster_form(self, name, icon, hp, hp_max, dmg_min, dmg_max, exp, respawn,
                         frame_width, frame_height,  # <-- Добавляем параметры размеров
                         name_var, icon_var, hp_var, hp_max_var, dmg_min_var, dmg_max_var, 
                         exp_var, respawn_var, frame_width_var=None, frame_height_var=None):  # <-- Добавляем переменные
        """Заполнить форму данными из шаблона"""
        name_var.set(name)
        icon_var.set(icon)
        hp_var.set(hp)
        hp_max_var.set(hp_max)
        dmg_min_var.set(dmg_min)
        dmg_max_var.set(dmg_max)
        exp_var.set(exp)
        respawn_var.set(respawn)
        
        # Заполняем размеры фрейма, если переменные переданы
        if frame_width_var is not None:
            frame_width_var.set(frame_width)
        if frame_height_var is not None:
            frame_height_var.set(frame_height)
    
    def create_new_monster(self, name, icon, hp, hp_max, dmg_min, dmg_max, exp, respawn, 
                          x, y, frame_width, frame_height, add_dialog, parent_dialog):  # <-- Добавили frame_width, frame_height
        """Создать нового монстра"""
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        # Проверяем лимит монстров
        if len(monsters_data) >= 5:
            messagebox.showwarning("⚠️ Лимит", "В локации может быть не более 5 монстров!", parent=add_dialog)
            return
        
        # Создаем нового монстра С РАЗМЕРАМИ ФРЕЙМА
        new_monster = Monster(
            name=name,
            hp=hp,
            hp_max=hp_max,
            min_dmg=dmg_min,
            max_dmg=dmg_max,
            icon=icon,
            x=x,
            y=y,
            frame_width=frame_width,    # <-- Добавляем размеры
            frame_height=frame_height,  # <--
            respawn_time=respawn
        )
        new_monster.exp_reward = exp
        
        # Добавляем в массив
        monsters_data.append(new_monster.to_dict())
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        messagebox.showinfo("✅ Успех", f"Монстр '{name}' создан!", parent=add_dialog)
        
        # Закрываем диалоги и обновляем редактор
        add_dialog.destroy()
        parent_dialog.destroy()
        self.open_monsters_editor(self.current_location)
        
        # Закрываем диалоги и обновляем редактор
        add_dialog.destroy()
        parent_dialog.destroy()
        self.open_monsters_editor(self.current_location)
    
    def save_monsters_editor(self, dialog):
        """Сохранить изменения в редакторе монстров"""
        location = self.current_location
        
        if not location or location not in self.config["locations"]:
            messagebox.showerror("Ошибка", "Локация не найдена!", parent=dialog)
            return
        
        try:
            # Сохраняем конфигурацию
            save_config(self.config)
            
            # Показываем сообщение об успехе
            loc_cfg = self.config["locations"].get(location, {})
            monsters_count = len(loc_cfg.get("monsters", []))
            
            messagebox.showinfo("✅ Сохранено", 
                              f"Настройки монстров для локации '{location}' сохранены!\n"
                              f"Всего монстров: {monsters_count}",
                              parent=dialog)
            
            # Закрываем диалог
            dialog.destroy()
            
            # Обновляем отображение монстров в текущей локации
            if self.current_screen == "location":
                self.show_monsters_in_location(location)
            
        except Exception as e:
            messagebox.showerror("Ошибка сохранения", 
                               f"Не удалось сохранить настройки: {str(e)}",
                               parent=dialog)
    
    def open_monster_loot_editor(self, monster_index, parent_dialog):
        """Редактор лута для конкретного монстра (ОБНОВЛЕННЫЙ с диапазонами)"""
        dialog = tk.Toplevel(parent_dialog)
        dialog.title(f"📦 Редактор лута - Монстр #{monster_index + 1}")
        dialog.geometry("800x600")
        dialog.configure(bg="#1a1a2e")
        dialog.transient(parent_dialog)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#0f3460", height=50)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text=f"📦 РЕДАКТОР ЛУТА МОНСТРА", font=("Arial", 12, "bold"),
                bg="#0f3460", fg="white").pack(pady=10)
        
        # Получаем данные монстра
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            dialog.destroy()
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        # Информация о монстре
        info_frame = tk.Frame(dialog, bg="#16213e", padx=10, pady=5)
        info_frame.pack(fill="x", padx=10, pady=5)
        
        tk.Label(info_frame, text=f"👹 {monster.name}", font=("Arial", 11, "bold"),
                bg="#16213e", fg="#F72585").pack(side="left")
        
        loot_count = len(monster.loot_table)
        tk.Label(info_frame, text=f"📦 Предметов в луте: {loot_count}/{monster.max_loot_items}", 
                font=("Arial", 10), bg="#16213e", fg="#4CC9F0").pack(side="right")
        
        # Основной контейнер с прокруткой
        main_container = tk.Frame(dialog, bg="#1a1a2e")
        main_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        canvas = tk.Canvas(main_container, bg="#1a1a2e", highlightthickness=0)
        scrollbar = tk.Scrollbar(main_container, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#1a1a2e")
        
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # 1. Существующие предметы
        if monster.loot_table:
            existing_frame = tk.Frame(scrollable_frame, bg="#16213e", relief="ridge", bd=2, padx=10, pady=10)
            existing_frame.pack(fill="x", pady=(0, 15))
            
            tk.Label(existing_frame, text="📋 ПРЕДМЕТЫ В ЛУТЕ", font=("Arial", 11, "bold"),
                    bg="#16213e", fg="#FFD54F").pack(anchor="w", pady=(0, 10))
            
            for i, loot_item in enumerate(monster.loot_table):
                item_frame = tk.Frame(existing_frame, bg="#8D6E63", relief="raised", bd=1, padx=10, pady=8)
                item_frame.pack(fill="x", pady=2)
                
                items_db = self.load_static_items()
                base_item = items_db.get(loot_item.base_item_id, {})
                
                # Верхняя строка
                top_frame = tk.Frame(item_frame, bg="#8D6E63")
                top_frame.pack(fill="x", pady=(0, 5))
                
                tk.Label(top_frame, text=f"📦 {base_item.get('name', loot_item.base_item_id)}", 
                        font=("Arial", 10, "bold"), bg="#8D6E63", fg="white").pack(side="left")
                
                # Информация о параметрах
                info_frame = tk.Frame(item_frame, bg="#8D6E63")
                info_frame.pack(fill="x", pady=2)
                
                tk.Label(info_frame, text=f"Шанс: {loot_item.drop_chance}% | Редкость: {loot_item.rarity}", 
                        font=("Arial", 9), bg="#8D6E63", fg="#FFD54F").pack(anchor="w")
                
                # Диапазоны
                ranges_frame = tk.Frame(item_frame, bg="#8D6E63")
                ranges_frame.pack(fill="x", pady=2)
                
                if base_item.get("type") == "weapon":
                    min_dmg = loot_item.min_damage_range if hasattr(loot_item, 'min_damage_range') else loot_item.damage_range[0]
                    max_dmg = loot_item.max_damage_range if hasattr(loot_item, 'max_damage_range') else loot_item.damage_range[1]
                    tk.Label(ranges_frame, text=f"⚔️ Урон: {min_dmg}-{max_dmg}", 
                            font=("Arial", 9), bg="#8D6E63", fg="#FF8A8A").pack(anchor="w")
                elif base_item.get("type") == "armor":
                    min_def = loot_item.min_defense_range if hasattr(loot_item, 'min_defense_range') else loot_item.defense_range[0]
                    max_def = loot_item.max_defense_range if hasattr(loot_item, 'max_defense_range') else loot_item.defense_range[1]
                    tk.Label(ranges_frame, text=f"🛡️ Защита: {min_def}-{max_def}", 
                            font=("Arial", 9), bg="#8D6E63", fg="#81C784").pack(anchor="w")
                
                tk.Label(ranges_frame, text=f"⚖️ Вес: {loot_item.weight_range[0]:.1f}-{loot_item.weight_range[1]:.1f} кг", 
                        font=("Arial", 9), bg="#8D6E63", fg="#FFECB3").pack(anchor="w")
                
                # Кнопки управления
                btn_frame = tk.Frame(item_frame, bg="#8D6E63")
                btn_frame.pack(fill="x", pady=(5, 0))
                
                tk.Button(btn_frame, text="✏️ Редактировать", font=("Arial", 9),
                         bg="#2196F3", fg="white", width=15,
                         command=lambda idx=i, m_idx=monster_index: 
                         self.edit_loot_item_dialog(m_idx, idx, dialog)).pack(side="left", padx=2)
                
                tk.Button(btn_frame, text="🗑 Удалить", font=("Arial", 9),
                         bg="#f44336", fg="white", width=10,
                         command=lambda idx=i, m_idx=monster_index: 
                         self.remove_loot_item(m_idx, idx, dialog, parent_dialog)).pack(side="right", padx=2)
        
        # 2. Форма добавления нового предмета
        add_frame = tk.Frame(scrollable_frame, bg="#16213e", relief="ridge", bd=2, padx=10, pady=10)
        add_frame.pack(fill="x")
        
        tk.Label(add_frame, text="➕ ДОБАВИТЬ НОВЫЙ ПРЕДМЕТ", font=("Arial", 11, "bold"),
                bg="#16213e", fg="#FFD54F").pack(anchor="w", pady=(0, 10))
        
        add_form = tk.Frame(add_frame, bg="#16213e")
        add_form.pack(fill="x")
        
        # ID предмета
        id_frame = tk.Frame(add_form, bg="#16213e")
        id_frame.pack(fill="x", pady=5)
        
        tk.Label(id_frame, text="ID предмета:", font=("Arial", 10),
                bg="#16213e", fg="white", width=15, anchor="w").pack(side="left")
        
        item_id_var = tk.StringVar()
        item_id_entry = tk.Entry(id_frame, textvariable=item_id_var, 
                                font=("Arial", 10), width=25, bg="white", fg="#333")
        item_id_entry.pack(side="left", padx=5)
        
        # Кнопка выбора из списка
        items_db = self.load_static_items()
        item_ids = list(items_db.keys())
        
        def show_item_selector():
            selector = tk.Toplevel(dialog)
            selector.title("📋 Выбор предмета")
            selector.geometry("400x300")
            selector.configure(bg="#1a1a2e")
            selector.transient(dialog)
            selector.grab_set()
            
            # Поиск
            search_frame = tk.Frame(selector, bg="#16213e", padx=10, pady=10)
            search_frame.pack(fill="x")
            
            search_var = tk.StringVar()
            tk.Entry(search_frame, textvariable=search_var, 
                    font=("Arial", 10), width=30, bg="white", fg="#333").pack(side="left", padx=5)
            
            def update_list():
                for widget in list_frame.winfo_children():
                    widget.destroy()
                
                search_text = search_var.get().lower()
                filtered_ids = [item_id for item_id in item_ids 
                              if search_text in item_id.lower() or 
                              search_text in items_db[item_id].get('name', '').lower()]
                
                for item_id in filtered_ids[:20]:  # Ограничиваем 20 элементами
                    item = items_db[item_id]
                    btn = tk.Button(list_frame, 
                                   text=f"{item.get('icon', '📦')} {item.get('name', item_id)}",
                                   font=("Arial", 9), bg="#16213e", fg="white",
                                   command=lambda iid=item_id: select_item(iid))
                    btn.pack(fill="x", pady=1)
            
            def select_item(selected_id):
                item_id_var.set(selected_id)
                # Автоматически определяем тип предмета
                if selected_id in items_db:
                    item = items_db[selected_id]
                    if item.get("type") == "weapon":
                        dmg_min_var.set(1)
                        dmg_max_var.set(10)
                    elif item.get("type") == "armor":
                        def_min_var.set(1)
                        def_max_var.set(5)
                selector.destroy()
            
            tk.Button(search_frame, text="🔍", font=("Arial", 10),
                     bg="#2196F3", fg="white", width=3,
                     command=update_list).pack(side="left")
            
            # Список предметов
            list_frame = tk.Frame(selector, bg="#1a1a2e")
            list_frame.pack(fill="both", expand=True, padx=10, pady=(0, 10))
            
            update_list()
            
            # Центрируем
            selector.update_idletasks()
            width = selector.winfo_width()
            height = selector.winfo_height()
            x = (dialog.winfo_screenwidth() // 2) - (width // 2)
            y = (dialog.winfo_screenheight() // 2) - (height // 2)
            selector.geometry(f'{width}x{height}+{x}+{y}')
        
        tk.Button(id_frame, text="📋 Выбрать", font=("Arial", 9),
                 bg="#2196F3", fg="white", width=10,
                 command=show_item_selector).pack(side="left", padx=5)
        
        # Шанс выпадения
        chance_frame = tk.Frame(add_form, bg="#16213e")
        chance_frame.pack(fill="x", pady=5)
        
        tk.Label(chance_frame, text="Шанс выпадения (%):", font=("Arial", 10),
                bg="#16213e", fg="white", width=15, anchor="w").pack(side="left")
        
        chance_var = tk.IntVar(value=10)
        tk.Spinbox(chance_frame, from_=1, to=100, textvariable=chance_var,
                  font=("Arial", 10), width=10, bg="white", fg="#333").pack(side="left", padx=5)
        
        # Редкость
        rarity_frame = tk.Frame(add_form, bg="#16213e")
        rarity_frame.pack(fill="x", pady=5)
        
        tk.Label(rarity_frame, text="Редкость:", font=("Arial", 10),
                bg="#16213e", fg="white", width=15, anchor="w").pack(side="left")
        
        rarity_var = tk.StringVar(value="Обычный")
        rarity_options = ["Обычный", "Необычный", "Редкий", "Эпический", "Легендарный"]
        tk.OptionMenu(rarity_frame, rarity_var, *rarity_options).pack(side="left", padx=5)
        
        # Диапазон урона
        damage_frame = tk.Frame(add_form, bg="#16213e")
        damage_frame.pack(fill="x", pady=5)
        
        tk.Label(damage_frame, text="Диапазон урона:", font=("Arial", 10),
                bg="#16213e", fg="white", width=15, anchor="w").pack(side="left")
        
        dmg_min_var = tk.IntVar(value=1)
        dmg_max_var = tk.IntVar(value=10)
        
        dmg_min_spinbox = tk.Spinbox(damage_frame, from_=1, to=100, textvariable=dmg_min_var,
                                    font=("Arial", 10), width=6, bg="white", fg="#333")
        dmg_min_spinbox.pack(side="left", padx=2)
        
        tk.Label(damage_frame, text="до", font=("Arial", 10),
                bg="#16213e", fg="white").pack(side="left", padx=5)
        
        dmg_max_spinbox = tk.Spinbox(damage_frame, from_=1, to=100, textvariable=dmg_max_var,
                                    font=("Arial", 10), width=6, bg="white", fg="#333")
        dmg_max_spinbox.pack(side="left", padx=2)
        
        # Диапазон защиты
        defense_frame = tk.Frame(add_form, bg="#16213e")
        defense_frame.pack(fill="x", pady=5)
        
        tk.Label(defense_frame, text="Диапазон защиты:", font=("Arial", 10),
                bg="#16213e", fg="white", width=15, anchor="w").pack(side="left")
        
        def_min_var = tk.IntVar(value=1)
        def_max_var = tk.IntVar(value=5)
        
        def_min_spinbox = tk.Spinbox(defense_frame, from_=1, to=50, textvariable=def_min_var,
                                    font=("Arial", 10), width=6, bg="white", fg="#333")
        def_min_spinbox.pack(side="left", padx=2)
        
        tk.Label(defense_frame, text="до", font=("Arial", 10),
                bg="#16213e", fg="white").pack(side="left", padx=5)
        
        def_max_spinbox = tk.Spinbox(defense_frame, from_=1, to=50, textvariable=def_max_var,
                                    font=("Arial", 10), width=6, bg="white", fg="#333")
        def_max_spinbox.pack(side="left", padx=2)
        
        # Диапазон веса
        weight_frame = tk.Frame(add_form, bg="#16213e")
        weight_frame.pack(fill="x", pady=5)
        
        tk.Label(weight_frame, text="Диапазон веса (кг):", font=("Arial", 10),
                bg="#16213e", fg="white", width=15, anchor="w").pack(side="left")
        
        weight_min_var = tk.DoubleVar(value=1.0)
        weight_max_var = tk.DoubleVar(value=3.0)
        
        weight_min_spinbox = tk.Spinbox(weight_frame, from_=0.1, to=20.0, increment=0.1,
                                       textvariable=weight_min_var, format="%.1f",
                                       font=("Arial", 10), width=6, bg="white", fg="#333")
        weight_min_spinbox.pack(side="left", padx=2)
        
        tk.Label(weight_frame, text="до", font=("Arial", 10),
                bg="#16213e", fg="white").pack(side="left", padx=5)
        
        weight_max_spinbox = tk.Spinbox(weight_frame, from_=0.1, to=20.0, increment=0.1,
                                       textvariable=weight_max_var, format="%.1f",
                                       font=("Arial", 10), width=6, bg="white", fg="#333")
        weight_max_spinbox.pack(side="left", padx=2)
        
        # Кнопка добавления
        btn_frame = tk.Frame(add_frame, bg="#16213e", pady=10)
        btn_frame.pack()
        
        add_btn = tk.Button(btn_frame, text="✅ Добавить предмет", font=("Arial", 11, "bold"),
                          bg="#4CAF50", fg="white", width=25,
                          command=lambda: self.add_loot_item_with_ranges_to_monster(
                              monster_index, item_id_var.get(), chance_var.get(), 
                              rarity_var.get(), dmg_min_var.get(), dmg_max_var.get(),
                              def_min_var.get(), def_max_var.get(),
                              weight_min_var.get(), weight_max_var.get(),
                              dialog, parent_dialog),
                          state="normal" if len(monster.loot_table) < monster.max_loot_items else "disabled")
        add_btn.pack()
        
        if len(monster.loot_table) >= monster.max_loot_items:
            tk.Label(btn_frame, text="⚠️ Достигнут лимит предметов в луте (5)", 
                    font=("Arial", 9), bg="#16213e", fg="#FF9800").pack(pady=(10, 0))
        
        # Кнопка закрытия
        close_btn_frame = tk.Frame(dialog, bg="#0f3460", height=50)
        close_btn_frame.pack(fill="x", side="bottom", pady=(10, 0))
        
        tk.Button(close_btn_frame, text="❌ Закрыть", font=("Arial", 10, "bold"),
                 bg="#f44336", fg="white", width=15,
                 command=dialog.destroy).pack(pady=10)
        
        # Функция для колесика мыши
        def on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        canvas.bind("<MouseWheel>", on_mousewheel)
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (parent_dialog.winfo_screenwidth() // 2) - (width // 2)
        y = (parent_dialog.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')
    
    def add_loot_item_to_monster(self, monster_index, item_id, chance, rarity, loot_dialog, parent_dialog):
        """Добавить предмет в лут монстра"""
        if not item_id:
            messagebox.showwarning("⚠️", "Выберите предмет!", parent=loot_dialog)
            return
        
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        # Проверяем лимит
        if len(monster.loot_table) >= monster.max_loot_items:
            messagebox.showwarning("⚠️", f"Достигнут лимит предметов в луте ({monster.max_loot_items})!", parent=loot_dialog)
            return
        
        # Создаем LootItem
        items_db = self.load_static_items()
        if item_id not in items_db:
            messagebox.showerror("❌ Ошибка", f"Предмет с ID '{item_id}' не найден!", parent=loot_dialog)
            return
        
        base_item = items_db[item_id]
        name_prefix = ""
        
        # Определяем префикс в зависимости от редкости
        if rarity == "Необычный":
            name_prefix = "Необычный"
        elif rarity == "Редкий":
            name_prefix = "Редкий"
        elif rarity == "Эпический":
            name_prefix = "Эпический"
        elif rarity == "Легендарный":
            name_prefix = "Легендарный"
        
        # Создаем LootItem
        loot_item = LootItem(
            base_item_id=item_id,
            name_prefix=name_prefix,
            damage_range=(1, 10) if base_item.get("type") == "weapon" else (1, 5),
            defense_range=(1, 5) if base_item.get("type") == "armor" else (1, 3),
            weight_range=(1.0, 3.0),
            drop_chance=chance,
            rarity=rarity
        )
        
        # Добавляем в таблицу лута
        monster.loot_table.append(loot_item)
        
        # Сохраняем изменения
        monsters_data[monster_index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        messagebox.showinfo("✅ Успех", f"Предмет добавлен в лут монстра!", parent=loot_dialog)
        
        # Закрываем и перезагружаем редактор лута
        loot_dialog.destroy()
        self.open_monster_loot_editor(monster_index, parent_dialog)
    
    def remove_loot_item(self, monster_index, loot_index, loot_dialog, parent_dialog):
        """Удалить предмет из лута монстра"""
        response = messagebox.askyesno("🗑 Удаление", "Удалить этот предмет из лута?", parent=loot_dialog)
        
        if not response:
            return
        
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        if loot_index >= len(monster.loot_table):
            return
        
        # Удаляем предмет
        monster.loot_table.pop(loot_index)
        
        # Сохраняем изменения
        monsters_data[monster_index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        messagebox.showinfo("✅ Удалено", "Предмет удален из лута!", parent=loot_dialog)
        
        # Закрываем и перезагружаем редактор лута
        loot_dialog.destroy()
        self.open_monster_loot_editor(monster_index, parent_dialog)


    def add_loot_item_to_monster(self, monster_index, item_id, chance, rarity, loot_dialog, parent_dialog):
        """Добавить предмет в лут монстра"""
        if not item_id:
            messagebox.showwarning("⚠️", "Выберите предмет!", parent=loot_dialog)
            return
        
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        # Проверяем лимит
        if len(monster.loot_table) >= monster.max_loot_items:
            messagebox.showwarning("⚠️", f"Достигнут лимит предметов в луте ({monster.max_loot_items})!", parent=loot_dialog)
            return
        
        # Создаем LootItem
        items_db = self.load_static_items()
        if item_id not in items_db:
            messagebox.showerror("❌ Ошибка", f"Предмет с ID '{item_id}' не найден!", parent=loot_dialog)
            return
        
        base_item = items_db[item_id]
        name_prefix = ""
        
        # Определяем префикс в зависимости от редкости
        if rarity == "Необычный":
            name_prefix = "Необычный"
        elif rarity == "Редкий":
            name_prefix = "Редкий"
        elif rarity == "Эпический":
            name_prefix = "Эпический"
        elif rarity == "Легендарный":
            name_prefix = "Легендарный"
        
        # Создаем LootItem с настраиваемыми диапазонами
        loot_item = LootItem(
            base_item_id=item_id,
            name_prefix=name_prefix,
            damage_range=(1, 10) if base_item.get("type") == "weapon" else (1, 5),
            defense_range=(1, 5) if base_item.get("type") == "armor" else (1, 3),
            weight_range=(1.0, 3.0),
            drop_chance=chance,
            rarity=rarity
        )
        
        # Добавляем в таблицу лута
        monster.loot_table.append(loot_item)
        
        # Сохраняем изменения
        monsters_data[monster_index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        messagebox.showinfo("✅ Успех", f"Предмет добавлен в лут монстра!", parent=loot_dialog)
        
        # Закрываем и перезагружаем редактор лута
        loot_dialog.destroy()
        self.open_monster_loot_editor(monster_index, parent_dialog)


    def edit_loot_item_dialog(self, monster_index, loot_index, parent_dialog):
        """Диалог редактирования предмета в луте"""
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        if loot_index >= len(monster.loot_table):
            return
        
        loot_item = monster.loot_table[loot_index]
        items_db = self.load_static_items()
        base_item = items_db.get(loot_item.base_item_id, {})
        
        dialog = tk.Toplevel(parent_dialog)
        dialog.title(f"✏️ Редактирование предмета лута")
        dialog.geometry("550x600")  # Увеличиваем высоту для расходников
        dialog.configure(bg="#1a1a2e")
        dialog.transient(parent_dialog)
        dialog.grab_set()
        
        # Заголовок
        header_frame = tk.Frame(dialog, bg="#0f3460", height=50)
        header_frame.pack(fill="x")
        
        tk.Label(header_frame, text=f"✏️ РЕДАКТИРОВАНИЕ ПРЕДМЕТА ЛУТА", font=("Arial", 12, "bold"),
                bg="#0f3460", fg="white").pack(pady=10)
        
        # Информация о предмете
        info_frame = tk.Frame(dialog, bg="#16213e", padx=10, pady=5)
        info_frame.pack(fill="x", padx=10, pady=5)
        
        tk.Label(info_frame, text=f"📦 {base_item.get('name', loot_item.base_item_id)}", 
                font=("Arial", 11, "bold"), bg="#16213e", fg="#F72585").pack(side="left")
        
        tk.Label(info_frame, text=f"🎭 {base_item.get('type', 'предмет')}", 
                font=("Arial", 10), bg="#16213e", fg="#4CC9F0").pack(side="right")
        
        # Форма редактирования
        form_frame = tk.Frame(dialog, bg="#16213e", padx=15, pady=15)
        form_frame.pack(fill="both", expand=True)
        
        # Шанс выпадения
        chance_frame = tk.Frame(form_frame, bg="#16213e")
        chance_frame.pack(fill="x", pady=5)
        
        tk.Label(chance_frame, text="Шанс выпадения (%):", font=("Arial", 10),
                bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
        
        chance_var = tk.IntVar(value=loot_item.drop_chance)
        tk.Spinbox(chance_frame, from_=1, to=100, textvariable=chance_var,
                  font=("Arial", 10), width=10, bg="white", fg="#333").pack(side="left", padx=5)
        
        # Редкость
        rarity_frame = tk.Frame(form_frame, bg="#16213e")
        rarity_frame.pack(fill="x", pady=5)
        
        tk.Label(rarity_frame, text="Редкость:", font=("Arial", 10),
                bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
        
        rarity_var = tk.StringVar(value=loot_item.rarity)
        rarity_options = ["Обычный", "Необычный", "Редкий", "Эпический", "Легендарный"]
        tk.OptionMenu(rarity_frame, rarity_var, *rarity_options).pack(side="left", padx=5)
        
        # Тип предмета
        item_type = base_item.get("type", "unknown")
        
        # Переменные для диапазонов
        dmg_min_var = None
        dmg_max_var = None
        def_min_var = None
        def_max_var = None
        effect_min_var = None
        effect_max_var = None
        effect_type_var = None
        
        # Секция для оружия
        if item_type == "weapon":
            dmg_frame = tk.Frame(form_frame, bg="#16213e")
            dmg_frame.pack(fill="x", pady=5)
            
            tk.Label(dmg_frame, text="Диапазон урона:", font=("Arial", 10),
                    bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
            
            # Минимальный урон
            dmg_min_frame = tk.Frame(dmg_frame, bg="#16213e")
            dmg_min_frame.pack(side="left", padx=2)
            
            tk.Label(dmg_min_frame, text="Мин:", font=("Arial", 9),
                    bg="#16213e", fg="white").pack()
            dmg_min_var = tk.IntVar(value=loot_item.min_damage_range if hasattr(loot_item, 'min_damage_range') else loot_item.damage_range[0])
            tk.Spinbox(dmg_min_frame, from_=1, to=100, textvariable=dmg_min_var,
                      font=("Arial", 10), width=8, bg="white", fg="#333").pack()
            
            tk.Label(dmg_frame, text="-", font=("Arial", 10),
                    bg="#16213e", fg="white").pack(side="left", padx=2)
            
            # Максимальный урон
            dmg_max_frame = tk.Frame(dmg_frame, bg="#16213e")
            dmg_max_frame.pack(side="left", padx=2)
            
            tk.Label(dmg_max_frame, text="Макс:", font=("Arial", 9),
                    bg="#16213e", fg="white").pack()
            dmg_max_var = tk.IntVar(value=loot_item.max_damage_range if hasattr(loot_item, 'max_damage_range') else loot_item.damage_range[1])
            tk.Spinbox(dmg_max_frame, from_=1, to=100, textvariable=dmg_max_var,
                      font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Секция для брони
        elif item_type == "armor":
            def_frame = tk.Frame(form_frame, bg="#16213e")
            def_frame.pack(fill="x", pady=5)
            
            tk.Label(def_frame, text="Диапазон защиты:", font=("Arial", 10),
                    bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
            
            # Минимальная защита
            def_min_frame = tk.Frame(def_frame, bg="#16213e")
            def_min_frame.pack(side="left", padx=2)
            
            tk.Label(def_min_frame, text="Мин:", font=("Arial", 9),
                    bg="#16213e", fg="white").pack()
            def_min_var = tk.IntVar(value=loot_item.min_defense_range if hasattr(loot_item, 'min_defense_range') else loot_item.defense_range[0])
            tk.Spinbox(def_min_frame, from_=1, to=50, textvariable=def_min_var,
                      font=("Arial", 10), width=8, bg="white", fg="#333").pack()
            
            tk.Label(def_frame, text="-", font=("Arial", 10),
                    bg="#16213e", fg="white").pack(side="left", padx=2)
            
            # Максимальная защита
            def_max_frame = tk.Frame(def_frame, bg="#16213e")
            def_max_frame.pack(side="left", padx=2)
            
            tk.Label(def_max_frame, text="Макс:", font=("Arial", 9),
                    bg="#16213e", fg="white").pack()
            def_max_var = tk.IntVar(value=loot_item.max_defense_range if hasattr(loot_item, 'max_defense_range') else loot_item.defense_range[1])
            tk.Spinbox(def_max_frame, from_=1, to=50, textvariable=def_max_var,
                      font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Секция для расходников
        elif item_type == "consumable":
            # Тип эффекта (только heal или mana)
            effect_type_frame = tk.Frame(form_frame, bg="#16213e")
            effect_type_frame.pack(fill="x", pady=5)
            
            tk.Label(effect_type_frame, text="Тип эффекта:", font=("Arial", 10),
                    bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
            
            # Используем текущее значение или 'heal' по умолчанию
            current_effect = getattr(loot_item, 'effect_type', 'heal')
            effect_type_var = tk.StringVar(value=current_effect)
            
            # Только 2 варианта: лечение или восстановление маны
            effect_type_options = ["heal", "mana"]
            effect_type_combo = ttk.Combobox(effect_type_frame, textvariable=effect_type_var,
                                           values=effect_type_options, state="readonly", width=15)
            effect_type_combo.pack(side="left", padx=5)
            
            # Диапазон эффективности
            effect_frame = tk.Frame(form_frame, bg="#16213e")
            effect_frame.pack(fill="x", pady=5)
            
            tk.Label(effect_frame, text="Диапазон эффекта:", font=("Arial", 10),
                    bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
            
            # Минимальная эффективность
            effect_min_frame = tk.Frame(effect_frame, bg="#16213e")
            effect_min_frame.pack(side="left", padx=2)
            
            tk.Label(effect_min_frame, text="Мин:", font=("Arial", 9),
                    bg="#16213e", fg="white").pack()
            
            # Используем текущее значение или 10 по умолчанию
            current_effect_min = loot_item.consumable_effect_range[0] if hasattr(loot_item, 'consumable_effect_range') else 10
            effect_min_var = tk.IntVar(value=current_effect_min)
            tk.Spinbox(effect_min_frame, from_=1, to=100, textvariable=effect_min_var,
                      font=("Arial", 10), width=8, bg="white", fg="#333").pack()
            
            tk.Label(effect_frame, text="-", font=("Arial", 10),
                    bg="#16213e", fg="white").pack(side="left", padx=2)
            
            # Максимальная эффективность
            effect_max_frame = tk.Frame(effect_frame, bg="#16213e")
            effect_max_frame.pack(side="left", padx=2)
            
            tk.Label(effect_max_frame, text="Макс:", font=("Arial", 9),
                    bg="#16213e", fg="white").pack()
            
            # Используем текущее значение или 30 по умолчанию
            current_effect_max = loot_item.consumable_effect_range[1] if hasattr(loot_item, 'consumable_effect_range') else 30
            effect_max_var = tk.IntVar(value=current_effect_max)
            tk.Spinbox(effect_max_frame, from_=1, to=100, textvariable=effect_max_var,
                      font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Диапазон веса (для всех предметов)
        weight_frame = tk.Frame(form_frame, bg="#16213e")
        weight_frame.pack(fill="x", pady=5)
        
        tk.Label(weight_frame, text="Диапазон веса:", font=("Arial", 10),
                bg="#16213e", fg="white", width=20, anchor="w").pack(side="left")
        
        # Минимальный вес
        weight_min_frame = tk.Frame(weight_frame, bg="#16213e")
        weight_min_frame.pack(side="left", padx=2)
        
        tk.Label(weight_min_frame, text="Мин:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        weight_min_var = tk.DoubleVar(value=loot_item.weight_range[0])
        tk.Spinbox(weight_min_frame, from_=0.1, to=20.0, increment=0.1, 
                  textvariable=weight_min_var, format="%.1f",
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        tk.Label(weight_frame, text="-", font=("Arial", 10),
                bg="#16213e", fg="white").pack(side="left", padx=2)
        
        # Максимальный вес
        weight_max_frame = tk.Frame(weight_frame, bg="#16213e")
        weight_max_frame.pack(side="left", padx=2)
        
        tk.Label(weight_max_frame, text="Макс:", font=("Arial", 9),
                bg="#16213e", fg="white").pack()
        weight_max_var = tk.DoubleVar(value=loot_item.weight_range[1])
        tk.Spinbox(weight_max_frame, from_=0.1, to=20.0, increment=0.1,
                  textvariable=weight_max_var, format="%.1f",
                  font=("Arial", 10), width=8, bg="white", fg="#333").pack()
        
        # Кнопки
        btn_frame = tk.Frame(dialog, bg="#0f3460", height=70)
        btn_frame.pack(fill="x", side="bottom", pady=(10, 0))
        
        btn_container = tk.Frame(btn_frame, bg="#0f3460", pady=15)
        btn_container.pack()
        
        # Кнопка сохранения
        save_btn = tk.Button(btn_container, text="💾 Сохранить", font=("Arial", 10, "bold"),
                           bg="#4CAF50", fg="white", width=15,
                           command=lambda: self.save_loot_item_changes(
                               monster_index, loot_index, chance_var.get(), rarity_var.get(),
                               dmg_min_var.get() if item_type == "weapon" else None,
                               dmg_max_var.get() if item_type == "weapon" else None,
                               def_min_var.get() if item_type == "armor" else None,
                               def_max_var.get() if item_type == "armor" else None,
                               effect_min_var.get() if item_type == "consumable" else None,
                               effect_max_var.get() if item_type == "consumable" else None,
                               effect_type_var.get() if item_type == "consumable" else None,
                               weight_min_var.get(), weight_max_var.get(),
                               dialog, parent_dialog))
        save_btn.pack(side="left", padx=5)
        
        # Кнопка отмены
        cancel_btn = tk.Button(btn_container, text="❌ Отмена", font=("Arial", 10, "bold"),
                              bg="#f44336", fg="white", width=15,
                              command=dialog.destroy)
        cancel_btn.pack(side="left", padx=5)
        
        # Центрируем окно
        dialog.update_idletasks()
        width = dialog.winfo_width()
        height = dialog.winfo_height()
        x = (parent_dialog.winfo_screenwidth() // 2) - (width // 2)
        y = (parent_dialog.winfo_screenheight() // 2) - (height // 2)
        dialog.geometry(f'{width}x{height}+{x}+{y}')
    
    def save_loot_item_changes(self, monster_index, loot_index, chance, rarity,
                             dmg_min, dmg_max, def_min, def_max,
                             effect_min, effect_max, effect_type,
                             weight_min, weight_max, edit_dialog, parent_dialog):
        """Сохранить изменения предмета лута"""
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        if loot_index >= len(monster.loot_table):
            return
        
        loot_item = monster.loot_table[loot_index]
        
        # Обновляем общие параметры
        loot_item.drop_chance = chance
        loot_item.rarity = rarity
        loot_item.weight_range = (weight_min, weight_max)
        
        # Обновляем диапазоны в зависимости от типа
        items_db = self.load_static_items()
        base_item = items_db.get(loot_item.base_item_id, {})
        item_type = base_item.get("type", "unknown")
        
        if item_type == "weapon" and dmg_min is not None and dmg_max is not None:
            loot_item.damage_range = (dmg_min, dmg_max)
            loot_item.min_damage_range = dmg_min
            loot_item.max_damage_range = dmg_max
        
        elif item_type == "armor" and def_min is not None and def_max is not None:
            loot_item.defense_range = (def_min, def_max)
            loot_item.min_defense_range = def_min
            loot_item.max_defense_range = def_max
        
        elif item_type == "consumable" and effect_min is not None and effect_max is not None and effect_type is not None:
            # Проверяем, что тип эффекта корректен (только heal или mana)
            if effect_type not in ["heal", "mana"]:
                effect_type = "heal"  # По умолчанию лечение
            
            # Обновляем параметры расходника
            loot_item.effect_type = effect_type
            loot_item.consumable_effect_range = (effect_min, effect_max)
        
        # Сохраняем изменения
        monsters_data[monster_index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        # Вместо messagebox.showinfo
        self.notification.show_notification("✅ Изменения сохранены!", "success", 2000)
        
        # Закрываем и перезагружаем редактор лута
        edit_dialog.destroy()
        parent_dialog.destroy()
        self.open_monsters_editor(self.current_location)

    def add_loot_item_with_ranges_to_monster(self, monster_index, item_id, chance, rarity, 
                                            dmg_min, dmg_max, def_min, def_max,
                                            weight_min, weight_max, loot_dialog, parent_dialog):
        """Добавить предмет в лут монстра с настраиваемыми диапазонами"""
        if not item_id:
            messagebox.showwarning("⚠️", "Выберите предмет!", parent=loot_dialog)
            return
        
        loc_cfg = self.config["locations"].get(self.current_location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index >= len(monsters_data):
            return
        
        monster_data = monsters_data[monster_index]
        monster = Monster.from_dict(monster_data)
        
        # Проверяем лимит
        if len(monster.loot_table) >= monster.max_loot_items:
            messagebox.showwarning("⚠️", f"Достигнут лимит предметов в луте ({monster.max_loot_items})!", parent=loot_dialog)
            return
        
        # Создаем LootItem
        items_db = self.load_static_items()
        if item_id not in items_db:
            messagebox.showerror("❌ Ошибка", f"Предмет с ID '{item_id}' не найден!", parent=loot_dialog)
            return
        
        base_item = items_db[item_id]
        item_type = base_item.get("type", "unknown")
        name_prefix = ""
        
        # Определяем префикс в зависимости от редкости
        if rarity == "Необычный":
            name_prefix = "Необычный"
        elif rarity == "Редкий":
            name_prefix = "Редкий"
        elif rarity == "Эпический":
            name_prefix = "Эпический"
        elif rarity == "Легендарный":
            name_prefix = "Легендарный"
        
        # Создаем LootItem с настраиваемыми диапазонами
        if item_type == "weapon":
            loot_item = LootItem(
                base_item_id=item_id,
                name_prefix=name_prefix,
                damage_range=(dmg_min, dmg_max),
                defense_range=(1, 3),  # Не используется для оружия
                weight_range=(weight_min, weight_max),
                drop_chance=chance,
                rarity=rarity,
                min_damage_range=dmg_min,
                max_damage_range=dmg_max
            )
        elif item_type == "armor":
            loot_item = LootItem(
                base_item_id=item_id,
                name_prefix=name_prefix,
                damage_range=(1, 5),  # Не используется для брони
                defense_range=(def_min, def_max),
                weight_range=(weight_min, weight_max),
                drop_chance=chance,
                rarity=rarity,
                min_defense_range=def_min,
                max_defense_range=def_max
            )
        elif item_type == "consumable":
            # Для расходников используем лечение по умолчанию и диапазон эффекта 10-30
            loot_item = LootItem(
                base_item_id=item_id,
                name_prefix=name_prefix,
                damage_range=(1, 5),  # Не используется
                defense_range=(1, 3),  # Не используется
                weight_range=(weight_min, weight_max),
                drop_chance=chance,
                rarity=rarity,
                effect_type="heal",  # По умолчанию лечение
                consumable_effect_range=(10, 30)  # По умолчанию 10-30
            )
        else:
            # Для других типов предметов
            loot_item = LootItem(
                base_item_id=item_id,
                name_prefix=name_prefix,
                damage_range=(1, 5),
                defense_range=(1, 3),
                weight_range=(weight_min, weight_max),
                drop_chance=chance,
                rarity=rarity
            )
        
        # Добавляем в таблицу лута
        monster.loot_table.append(loot_item)
        
        # Сохраняем изменения
        monsters_data[monster_index] = monster.to_dict()
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][self.current_location] = loc_cfg
        save_config(self.config)
        
        messagebox.showinfo("✅ Успех", f"Предмет добавлен в лут монстра!", parent=loot_dialog)
        
        # Закрываем и перезагружаем редактор лута
        loot_dialog.destroy()
        self.open_monster_loot_editor(monster_index, parent_dialog)

    def validate_and_fix_monster_positions(self, location):
        """Проверить и исправить позиции монстров, если они выходят за границы"""
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
    
        if not monsters_data:
            return
    
        window_width = self.config["window"]["width"]
        window_height = self.config["window"]["height"]
    
        for i, monster_data in enumerate(monsters_data):
            x = monster_data.get("x", 400)
            y = monster_data.get("y", 100)
        
            # Проверяем границы окна
            if x < 20:
                monster_data["x"] = 20
            elif x > window_width - 140:  # Ширина фрейма монстра ~120px + отступы
                monster_data["x"] = window_width - 140
            
            if y < 20:
             monster_data["y"] = 20
            elif y > window_height - 160:  # Высота фрейма монстра ~90px + отступы
                monster_data["y"] = window_height - 160
        
            # Если есть несколько монстров, добавляем смещение
            if i > 0:
                monster_data["x"] += i * 20
                monster_data["y"] += i * 30
            
                # Проверяем снова после смещения
                if monster_data["x"] > window_width - 140:
                    monster_data["x"] = max(20, monster_data["x"] - (i * 40))
            
                if monster_data["y"] > window_height - 160:
                    monster_data["y"] = max(20, monster_data["y"] - (i * 60))
    
        # Сохраняем исправленные позиции
        loc_cfg["monsters"] = monsters_data
        self.config["locations"][location] = loc_cfg
        save_config(self.config)
    
        print(f"✅ Проверены и исправлены позиции монстров в {location}")

    def save_monster_state(self, location, monster_index, monster):
        """Сохранить состояние монстра после боя"""
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if monster_index < len(monsters_data):
            # Сохраняем текущее состояние монстра
            monsters_data[monster_index] = monster.to_dict()
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            
            print(f"💾 Сохранено состояние монстра {monster.name}: alive={monster.is_alive}, respawn_time={monster.respawn_time}")


    def get_monster_frame_size(self, location, index):
        """Получить размеры фрейма монстра для согласованности"""
        # Стандартные размеры фрейма монстра
        return {
            'width': 120,
            'height': 90,
            'padding': 5  # Отступы внутри фрейма
        }

    def use_item(self, item_index):
        """Использовать предмет из инвентаря"""
        try:
            if not self.player_data or item_index >= len(self.player_data["inventory"]):
                self.notification.show_notification("Предмет не найден!", "error", 3000)
                return
            
            item = self.player_data["inventory"][item_index]
            
            # Получаем данные предмета в зависимости от типа
            if isinstance(item, dict):
                # Это объект предмета из лута
                item_data = item
                item_type = item_data.get("type", "")
            else:
                # Это ID предмета (строка)
                items_db = self.load_items()
                item_data = items_db.get(item, {})
                item_type = item_data.get("type", "")
            
            # Проверяем, является ли предмет расходником
            if item_type != "consumable":
                self.notification.show_notification(
                    "Этот предмет нельзя использовать!",
                    "warning",
                    3000
                )
                return
            
            # Получаем эффект зелья
            effect = item_data.get("effect", "heal")
            value = item_data.get("value", 20)
            item_name = item_data.get("name", "Зелье")
            
            # Проверяем максимальные значения
            if effect == "heal":
                current_hp = self.player_data.get("hp", 0)
                max_hp = self.player_data.get("hp_max", 100)
                
                if current_hp >= max_hp:
                    self.notification.show_notification(
                        "❤️ У вас уже максимальное здоровье!",
                        "info",
                        3000
                    )
                    return
                
                # Восстанавливаем здоровье
                new_hp = min(current_hp + value, max_hp)
                heal_amount = new_hp - current_hp
                self.player_data["hp"] = new_hp
                
                # Показываем уведомление
                self.notification.show_notification(
                    f"❤️ Вы восстановили {heal_amount} HP",
                    "success",
                    3000
                )
                
            elif effect == "mana":
                current_mp = self.player_data.get("mp", 0)
                max_mp = self.player_data.get("mp_max", 20)
                
                if current_mp >= max_mp:
                    self.notification.show_notification(
                        "💙 У вас уже максимальная мана!",
                        "info",
                        3000
                    )
                    return
                
                # Восстанавливаем ману
                new_mp = min(current_mp + value, max_mp)
                mana_amount = new_mp - current_mp
                self.player_data["mp"] = new_mp
                
                # Показываем уведомление
                self.notification.show_notification(
                    f"💙 Вы восстановили {mana_amount} MP",
                    "success",
                    3000
                )
            
            else:
                self.notification.show_notification(
                    f"Неизвестный эффект зелья: {effect}",
                    "warning",
                    3000
                )
                return
            
            # УДАЛЯЕМ предмет из инвентаря после использования
            self.player_data["inventory"].pop(item_index)
            
            # Сохраняем изменения
            self.save_current_player()
            
            # Обновляем интерфейс
            self.update_health_display()
            self.update_mana_display()
            
            if self.sidebar_open:
                self.update_sidebar_stats()
            
            # Обновляем отображение инвентаря
            if self.current_screen == "inventory":
                self.show_inventory()
            
            # Показываем анимацию
            if hasattr(self, 'root') and self.root.winfo_exists():
                x_pos = self.root.winfo_width() // 2
                color = "#4CAF50" if effect == "heal" else "#2196F3"
                symbol = "❤️" if effect == "heal" else "💙"
                self.animate_gain(self.root, x_pos, 200, f"{symbol}+{value}", color)
                
        except Exception as e:
            print(f"⚠️ Ошибка в use_item: {e}")
            self.notification.show_notification(
                "Ошибка при использовании предмета!",
                "error",
                3000
            )


    def drop_item(self, item_index):
        """Выбросить предмет из инвентаря"""
        if not self.player_data or item_index >= len(self.player_data["inventory"]):
            self.notification.show_notification("Предмет не найден!", "error", 3000)
            return
        
        item = self.player_data["inventory"][item_index]
        
        # Получаем название предмета
        items_db = self.load_items()
        if isinstance(item, dict):
            item_name = item.get("name", "Предмет")
        else:
            item_data = items_db.get(item, {})
            item_name = item_data.get("name", "Предмет")
        
        # Подтверждение удаления
        confirm = messagebox.askyesno(
            "🗑 Выбросить предмет",
            f"Вы уверены, что хотите выбросить '{item_name}'?",
            parent=self.root
        )
        
        if confirm:
            # Удаляем предмет
            self.player_data["inventory"].pop(item_index)
            self.save_current_player()
            
            self.notification.show_notification(
                f"🗑 {item_name} выброшен",
                "info",
                3000
            )
            
            # Обновляем интерфейс
            self.show_inventory()

    def equip_item_from_inventory(self, item_index, slot, item):
        """Экипировать предмет из инвентаря по индексу"""
        if not self.player_data or item_index >= len(self.player_data["inventory"]):
            self.notification.show_notification("Предмет не найден!", "error", 3000)
            return
        
        # Проверяем вес инвентаря перед экипировкой
        items_db = self.load_items()
        
        # Определяем вес предмета
        if isinstance(item, dict):
            # Это объект предмета из лута
            item_data = item
            item_weight = item.get("weight", 0)
        else:
            # Это ID предмета
            item_data = items_db.get(item, {})
            item_weight = item_data.get("weight", 0)
        
        # Проверяем требования для экипировки
        can_equip, reason = self.can_equip_item(item_data)
        if not can_equip:
            self.notification.show_notification(
                f"Нельзя экипировать: {reason}",
                "warning",
                3000
            )
            return
        
        # Экипируем предмет
        self.equip_item(slot, item)
        
        # Обновляем интерфейс
        self.show_inventory()
        
        # Обновляем статистики в боковом меню
        if self.sidebar_open:
            self.update_sidebar_stats()
        
        # Показываем уведомление
        item_name = item_data.get("name", "Предмет")
        self.notification.show_notification(
            f"✅ {item_name} экипирован",
            "success",
            3000
        )

    def logout(self):
        """Выход из аккаунта"""
        if self.player_data:
            self.player_data["current_location"] = self.current_location
            self.save_current_player()
            self.save_chest()  # Сохраняем сундук перед выходом
    
        self.player_data = {}
        self.chest_items = []  # Очищаем предметы сундука
        self.equipped_abilities = []  # Сбрасываем экипированные умения
        self.show_login_screen()

    def create_abilities_cards_for_window(self, container):
        """Создать карточки умений для окна"""
        player_class = self.player_data.get("class")
        player_mp = self.player_data.get("mp", 0)
        
        for ab_id in self.abilities:
            ability = self.abilities[ab_id]
            
            # Проверяем, подходит ли умение классу игрока
            if ability.class_requirement != player_class:
                continue
            
            # Создаем карточку умения
            ability_card = tk.Frame(container, bg="#333", relief="ridge", bd=2, padx=10, pady=10)
            ability_card.pack(fill="x", pady=5)
            
            # Левая часть - иконка и название
            left_frame = tk.Frame(ability_card, bg="#333")
            left_frame.pack(side="left", fill="both", expand=True)
            
            tk.Label(left_frame, text=ability.icon, font=("Arial", 24),
                    bg="#333", fg="white").pack(side="left", padx=(0, 10))
            
            name_frame = tk.Frame(left_frame, bg="#333")
            name_frame.pack(side="left", fill="both", expand=True)
            
            tk.Label(name_frame, text=ability.name, font=("Arial", 12, "bold"),
                    bg="#333", fg="white").pack(anchor="w")
            
            # Правая часть - кнопка использования
            right_frame = tk.Frame(ability_card, bg="#333")
            right_frame.pack(side="right")
            
            can_use = ability.can_use(player_mp, player_class)
            btn_color = "#4CAF50" if can_use else "#757575"
            
            use_btn = tk.Button(right_frame, text="Использовать" if can_use else "Недоступно",
                              font=("Arial", 10, "bold"), bg=btn_color, fg="white",
                              command=lambda ab=ability.id: self.use_ability_in_battle(ab),
                              state="normal" if can_use else "disabled")
            use_btn.pack()


    def update_turn_timer(self):
        """Обновить таймер хода (10 секунд)"""
        if not self.battle_active:
            return
        
        elapsed = time.time() - self.turn_start_time
        remaining = max(0, self.turn_time - elapsed)
        
        progress_percent = (elapsed / self.turn_time) * 100
        if hasattr(self, 'turn_progress'):
            self.turn_progress.set(min(100, progress_percent))
        
        if hasattr(self, 'turn_timer_label'):
            try:
                self.turn_timer_label.config(text=f"⏱️ Время: {int(remaining)} сек")
            except:
                pass
        
        # Если прошло 9 секунд и монстр еще не атаковал - атакуем принудительно
        if elapsed >= 9 and not self.monster_acted_this_turn and not self.monster_attack_scheduled:
            if self.battle_monster and not self.battle_monster.stunned_turns > 0:
                self.add_battle_log(f"Монстр атакует в последний момент!", "#FF5722")
                self.monster_acted_this_turn = True
                self.perform_monster_attack()
        
        if elapsed >= self.turn_time:
            if not self.turn_end_scheduled:
                self.turn_end_scheduled = True
                self.add_battle_log("Время вышло! Завершение хода", "#EF5350")
                self.end_turn()
        else:
            if hasattr(self, 'turn_update_job'):
                try:
                    self.root.after_cancel(self.turn_update_job)
                except:
                    pass
            self.turn_update_job = self.root.after(100, self.update_turn_timer)

    def end_turn(self):
        """Завершить ход"""
        # Проверяем условия окончания боя
        if (self.player_data["hp"] <= 0 or 
            (self.battle_monster and self.battle_monster.hp <= 0)):
            self.root.after(1000, self.check_battle_end)
        else:
            if self.battle_active:
                self.root.after(1000, self.start_turn)

    def end_turn(self):
        """Завершить ход"""
        # Обновляем окна умений перед сменой хода
        self.update_all_ability_cards()
        
        # Проверяем условия окончания боя
        if (self.player_data["hp"] <= 0 or 
            (self.battle_monster and self.battle_monster.hp <= 0)):
            self.root.after(1000, self.check_battle_end)
        else:
            if self.battle_active:
                self.root.after(1000, self.start_turn)

    def check_battle_end(self):
        """Проверить условия окончания боя"""
        if not self.battle_active:
            return
        
        if self.player_data["hp"] <= 0:
            self.end_battle(False, self.battle_monster, self.battle_location)
        elif self.battle_monster and self.battle_monster.hp <= 0:
            self.end_battle(True, self.battle_monster, self.battle_location)

    def player_attack(self):
        """Атака игрока"""
        if (not self.battle_active or 
            self.player_acted_this_turn or 
            not self.battle_monster or 
            self.battle_monster.hp <= 0):
            return
        
        self.player_acted_this_turn = True
        
        # Блокируем кнопки после действия
        if hasattr(self, 'attack_button'):
            try:
                self.attack_button.config(state="disabled", bg="#9E9E9E")
            except:
                pass
        
        if hasattr(self, 'abilities_button'):
            try:
                self.abilities_button.config(state="disabled", bg="#757575")
            except:
                pass
        
        player_class = self.player_data.get("class", "Воин")
        
        if player_class == "Маг":
            if self.player_data["mp"] >= 5:
                self.player_data["mp"] -= 5
                dmg = self.calculate_stats()["damage"] + 3
                self.update_mana_display()
                self.add_battle_log("Вы используете магическую атаку!", "#BB86FC")
            else:
                dmg = 1
                self.add_battle_log("Недостаточно маны для атаки!", "#EF5350")
        else:
            dmg = self.calculate_stats()["damage"]
            self.add_battle_log(f"Вы атакуете монстра!", "#4CAF50")
        
        self.battle_monster.take_damage(dmg)
        if hasattr(self, 'monster_hp_label'):
            try:
                self.monster_hp_label.config(text=f"❤️ HP: {self.battle_monster.hp}/{self.battle_monster.hp_max}")
            except:
                pass
        
        self.add_battle_log(f"Вы нанесли {dmg} урона монстру", "#4CAF50")
        
        try:
            self.show_damage_animation(450, 80, f"-{dmg}", "#D32F2F")
        except:
            pass
        
        # Проверяем, не убит ли монстр
        if self.battle_monster.hp <= 0:
            # Если монстр был запланирован на атаку, отменяем
            if self.monster_attack_scheduled:
                try:
                    # Отменяем запланированную атаку
                    self.root.after_cancel(self.monster_attack_scheduled)
                except:
                    pass
            
            try:
                self.root.after(1500, lambda: self.check_battle_end())
            except:
                pass

    def monster_attack(self):
        """Атака монстра"""
        if (not self.battle_active or 
            self.monster_acted_this_turn or 
            not self.battle_monster or 
            self.battle_monster.hp <= 0):
            return
        
        self.monster_acted_this_turn = True
        
        base_dmg = self.battle_monster.attack()
        armor = self.calculate_stats()["armor"]
        final_dmg = self.apply_armor_to_damage(base_dmg, armor)
        
        reflected_damage = 0
        if hasattr(self, 'active_ability_effect') and self.active_ability_effect == "defense":
            reflected_damage = int(final_dmg * 0.3)
            final_dmg = 0
            self.active_ability_effect = None
            self.add_battle_log(f"🛡️ Щит отразил атаку! Отраженный урон: {reflected_damage}", "#4CAF50")
            
            self.battle_monster.take_damage(reflected_damage)
            if self.monster_hp_label:
                self.monster_hp_label.config(text=f"❤️ HP: {self.battle_monster.hp}/{self.battle_monster.hp_max}")
            
            self.add_battle_log(f"Монстр получил {reflected_damage} отраженного урона", "#4CAF50")
            
            self.show_damage_animation(450, 80, f"-{reflected_damage}", "#4CAF50")
        
        if final_dmg > 0:
            self.player_data["hp"] = max(0, self.player_data["hp"] - final_dmg)
            self.add_battle_log(f"Монстр атакует и наносит {final_dmg} урона (броня снизила урон с {base_dmg})", "#EF5350")
        
        self.update_health_display()
        
        # ================ ОБНОВЛЯЕМ ОКНА УМЕНИЙ ПОСЛЕ АТАКИ ================
        self.update_all_ability_cards()
        
        if final_dmg > 0:
            self.show_damage_animation(150, 80, f"-{final_dmg}", "#D32F2F")
        
        # Проверяем, не убит ли игрок
        if self.player_data["hp"] <= 0:
            self.root.after(1500, lambda: self.check_battle_end())
        else:
            # Если игрок еще не действовал, ждем его действия
            if not self.player_acted_this_turn:
                # Разблокируем кнопки для игрока
                if hasattr(self, 'attack_button'):
                    self.attack_button.config(state="normal", bg="#D32F2F")
                
                if hasattr(self, 'abilities_button'):
                    self.abilities_button.config(state="normal", bg="#7B1FA2")
            else:
                # Если оба действовали, проверяем конец боя
                self.root.after(1500, lambda: self.check_battle_end())

    def use_ability_in_battle(self, ability_id):
        """Использовать умение в бою"""
        if (not self.battle_active or 
            self.player_acted_this_turn or 
            ability_id not in self.abilities):
            return
        
        ability = self.abilities[ability_id]
        player_mp = self.player_data.get("mp", 0)
        player_class = self.player_data.get("class")
        
        # Проверяем, можно ли использовать умение
        if not ability.can_use(player_mp, player_class):
            self.add_battle_log(f"Нельзя использовать {ability.name}!", "#EF5350")
            return
        
        self.player_acted_this_turn = True
        
        # Блокируем кнопки после действия
        if hasattr(self, 'attack_button'):
            self.attack_button.config(state="disabled", bg="#9E9E9E")
        
        if hasattr(self, 'abilities_button'):
            self.abilities_button.config(state="disabled", bg="#757575")
        
        # Используем умение
        ability.use()
        self.player_data["mp"] -= ability.mana_cost
        self.update_mana_display()
        
        # Применяем эффект умения
        if ability.effect_type == "damage":
            # Урон от умения
            if ability.value == "50-150":
                dmg_multiplier = random.uniform(0.5, 1.5)
                dmg = int(self.calculate_stats()["damage"] * dmg_multiplier)
            else:
                dmg = ability.value if ability.value else self.calculate_stats()["damage"]
            
            self.battle_monster.take_damage(dmg)
            if self.monster_hp_label:
                self.monster_hp_label.config(text=f"❤️ HP: {self.battle_monster.hp}/{self.battle_monster.hp_max}")
            
            self.add_battle_log(f"Вы используете {ability.name} и наносите {dmg} урона!", "#BB86FC")
            self.show_damage_animation(450, 80, f"-{dmg}", "#BB86FC")
        
        elif ability.effect_type == "defense":
            self.active_ability_effect = "defense"
            self.add_battle_log(f"Вы используете {ability.name} - следующий удар будет отражен!", "#4CAF50")
        
        elif ability.effect_type == "stun":
            stun_turns = random.randint(1, 2)
            self.battle_monster.stunned_turns = stun_turns
            self.add_battle_log(f"Вы используете {ability.name} - монстр оглушен на {stun_turns} ход!", "#FFD54F")
        
        # Обновляем отображение умений
        self.update_ability_buttons_availability()
        
        # Проверяем, не убит ли монстр
        if self.battle_monster.hp <= 0:
            self.root.after(1500, lambda: self.check_battle_end())
        else:
            # Если монстр еще не действовал, он атакует
            if not self.monster_acted_this_turn:
                self.root.after(1500, lambda: self.monster_attack())
            else:
                # Если оба действовали, проверяем конец боя
                self.root.after(1500, lambda: self.check_battle_end())


    def fix_dead_monsters_respawn_times(self, location):
        """Исправить время возрождения для всех мертвых монстров в локации"""
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        fixed_count = 0
        for i, monster_data in enumerate(monsters_data):
            monster = Monster.from_dict(monster_data)
            if not monster:
                continue
            
            if not monster.is_alive and monster.respawn_time is None:
                monster.respawn_time = time.time() + monster.default_respawn_time
                monsters_data[i] = monster.to_dict()
                fixed_count += 1
                print(f"🔧 Исправлен respawn_time для монстра {monster.name} (ID: {monster.id})")
        
        if fixed_count > 0:
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            print(f"✅ Исправлено {fixed_count} монстров в локации {location}")
        
        return fixed_count


    def cleanup_duplicate_monsters(self, location):
        """Удалить дубликаты монстров в локации"""
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        if not monsters_data:
            return 0
        
        unique_monsters = []
        seen_ids = set()
        seen_names = set()
        removed_count = 0
        
        for monster_data in monsters_data:
            monster = Monster.from_dict(monster_data)
            if not monster:
                continue
            
            # Проверяем по ID
            if monster.id in seen_ids:
                print(f"🗑️ Удален дубликат по ID: {monster.name} (ID: {monster.id})")
                removed_count += 1
                continue
            
            # Проверяем по имени (опционально)
            if monster.name in seen_names:
                print(f"⚠️ Дубликат имени: {monster.name}. Рекомендуется переименовать.")
            
            seen_ids.add(monster.id)
            seen_names.add(monster.name)
            unique_monsters.append(monster_data)
        
        if removed_count > 0:
            loc_cfg["monsters"] = unique_monsters
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            print(f"✅ Удалено {removed_count} дубликатов в локации {location}")
        
        return removed_count

    def fix_respawn_times(self, location):
        """Исправить время возрождения только для мертвых монстров без respawn_time"""
        loc_cfg = self.config["locations"].get(location, {})
        monsters_data = loc_cfg.get("monsters", [])
        
        fixed_count = 0
        now = time.time()
        
        for i, monster_data in enumerate(monsters_data):
            monster = Monster.from_dict(monster_data)
            if not monster:
                continue
            
            # Только для мертвых монстров без respawn_time
            if not monster.is_alive and monster.respawn_time is None:
                monster.respawn_time = now + monster.default_respawn_time
                monsters_data[i] = monster.to_dict()
                fixed_count += 1
                print(f"🔧 Исправлен respawn_time для монстра {monster.name} (ID: {monster.id})")
            # Если время возрождения уже истекло, но монстр все еще мертв
            elif not monster.is_alive and monster.respawn_time is not None and monster.respawn_time <= now:
                print(f"⏰ Время возрождения истекло для {monster.name}, нужно воскресить")
                # Воскрешаем при следующем показе
                continue
        
        if fixed_count > 0:
            loc_cfg["monsters"] = monsters_data
            self.config["locations"][location] = loc_cfg
            save_config(self.config)
            print(f"✅ Исправлено {fixed_count} монстров в локации {location}")
        
        return fixed_count


    def ensure_monsters_saved(self, location):
        """Гарантированное сохранение монстров в конфигурацию"""
        try:
            if location in self.config.get("locations", {}):
                save_config(self.config)
                print(f"🔒 Гарантированное сохранение для локации {location}")
        except Exception as e:
            print(f"⚠️ Ошибка при гарантированном сохранении: {e}")


# ==============================
# ЗАПУСК
# ==============================
if __name__ == "__main__":
    root = tk.Tk()
    app = RPGApp(root)
    root.mainloop()

