import pygame
import random
import math
from enum import Enum

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 600
GRAVITY = 0.8
JUMP_STRENGTH = -15
PLAYER_SPEED = 5
ENEMY_SPEED = 2
MAX_JUMP_DISTANCE = 120  # Maximum horizontal distance player can jump

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
BROWN = (139, 69, 19)
GRAY = (128, 128, 128)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
YELLOW = (255, 255, 0)
BLUE = (0, 100, 255)
DARK_GRAY = (64, 64, 64)
ORANGE = (255, 165, 0)

class GameState(Enum):
    PLAYING = 1
    GAME_OVER = 2
    NEXT_ROOM = 3

class Player:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 30
        self.height = 40
        self.vel_x = 0
        self.vel_y = 0
        self.on_ground = False
        self.has_key = False
        self.alive = True
        self.jump_pressed = False  # Track if jump key is currently pressed
        
    def update(self, platforms, enemies, traps):
        if not self.alive:
            return
            
        # Apply gravity
        self.vel_y += GRAVITY
        if self.vel_y > 20:
            self.vel_y = 20
            
        # Update position
        self.x += self.vel_x
        self.y += self.vel_y
        
        # Check platform collisions
        self.on_ground = False
        player_rect = pygame.Rect(self.x, self.y, self.width, self.height)
        
        for platform in platforms:
            if player_rect.colliderect(platform.rect):
                if self.vel_y > 0:  # Falling down
                    self.y = platform.rect.top - self.height
                    self.vel_y = 0
                    self.on_ground = True
                elif self.vel_y < 0:  # Jumping up
                    self.y = platform.rect.bottom
                    self.vel_y = 0
                    
        # Check enemy collisions
        for enemy in enemies:
            if player_rect.colliderect(enemy.rect):
                self.alive = False
                
        # Check trap collisions
        for trap in traps:
            if player_rect.colliderect(trap.rect):
                self.alive = False
                
        # Keep player on screen
        if self.x < 0:
            self.x = 0
        elif self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width
            
        # Fall off the screen
        if self.y > SCREEN_HEIGHT:
            self.alive = False
            
    def jump(self):
        if self.on_ground:
            self.vel_y = JUMP_STRENGTH
            
    def draw(self, screen):
        color = GREEN if self.alive else RED
        pygame.draw.rect(screen, color, (self.x, self.y, self.width, self.height))
        # Draw explorer hat
        pygame.draw.polygon(screen, BROWN, [
            (self.x, self.y),
            (self.x + self.width, self.y),
            (self.x + self.width // 2, self.y - 10)
        ])
        # Draw key indicator
        if self.has_key:
            pygame.draw.circle(screen, YELLOW, (self.x + self.width // 2, self.y - 20), 5)

class Platform:
    def __init__(self, x, y, width, height):
        self.rect = pygame.Rect(x, y, width, height)
        
    def draw(self, screen):
        pygame.draw.rect(screen, GRAY, self.rect)
        pygame.draw.rect(screen, DARK_GRAY, self.rect, 2)

class Enemy:
    def __init__(self, x, y, platform_width, platform_x):
        self.x = x
        self.y = y
        self.width = 25
        self.height = 25
        self.vel_x = ENEMY_SPEED
        self.direction = 1
        self.platform_width = platform_width
        self.platform_x = platform_x
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        
    def update(self):
        self.x += self.vel_x * self.direction
        
        # Reverse direction at platform edges
        if self.x <= self.platform_x or self.x + self.width >= self.platform_x + self.platform_width:
            self.direction *= -1
            
        self.rect.x = self.x
        
    def draw(self, screen):
        pygame.draw.rect(screen, RED, self.rect)
        # Draw spikes
        for i in range(0, self.width, 5):
            pygame.draw.polygon(screen, DARK_GRAY, [
                (self.x + i, self.y),
                (self.x + i + 2.5, self.y - 5),
                (self.x + i + 5, self.y)
            ])

class Trap:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 30
        self.height = 10
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        
    def draw(self, screen):
        # Draw spike trap
        pygame.draw.rect(screen, DARK_GRAY, self.rect)
        for i in range(0, self.width, 6):
            pygame.draw.polygon(screen, RED, [
                (self.x + i, self.y),
                (self.x + i + 3, self.y + 10),
                (self.x + i + 6, self.y)
            ])

class Key:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 20
        self.height = 30
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        self.collected = False
        
    def draw(self, screen):
        if not self.collected:
            # Draw key shape
            pygame.draw.circle(screen, YELLOW, (self.x + 10, self.y + 10), 8)
            pygame.draw.rect(screen, YELLOW, (self.x + 6, self.y + 18, 8, 12))
            pygame.draw.rect(screen, BLACK, (self.x + 8, self.y + 22, 2, 6))
            pygame.draw.rect(screen, BLACK, (self.x + 12, self.y + 24, 2, 4))

class Door:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.width = 40
        self.height = 60
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        
    def draw(self, screen):
        pygame.draw.rect(screen, BROWN, self.rect)
        pygame.draw.rect(screen, BLACK, self.rect, 3)
        # Draw door handle
        pygame.draw.circle(screen, YELLOW, (self.x + 30, self.y + 30), 3)

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Cave Explorer")
        self.clock = pygame.time.Clock()
        self.running = True
        self.state = GameState.PLAYING
        self.room_number = 1
        self.generate_room()
        
    def generate_room(self):
        self.platforms = []
        self.enemies = []
        self.traps = []
        
        # Always create ground platform
        ground = Platform(0, SCREEN_HEIGHT - 40, SCREEN_WIDTH, 40)
        self.platforms.append(ground)
        
        # Generate random platforms
        num_platforms = random.randint(5, 8)
        for _ in range(num_platforms):
            width = random.randint(80, 200)
            height = 20
            x = random.randint(50, SCREEN_WIDTH - width - 50)
            y = random.randint(150, SCREEN_HEIGHT - 150)
            
            # Check if platform overlaps with existing ones
            new_rect = pygame.Rect(x, y, width, height)
            overlap = False
            for platform in self.platforms:
                if new_rect.colliderect(platform.rect):
                    overlap = True
                    break
                    
            if not overlap:
                platform = Platform(x, y, width, height)
                self.platforms.append(platform)
                
                # Randomly add enemies to platforms
                if random.random() < 0.4 and platform != ground:
                    enemy_x = x + random.randint(0, width - 25)
                    enemy = Enemy(enemy_x, y - 25, width, x)
                    self.enemies.append(enemy)
                    
                # Randomly add traps to platforms
                if random.random() < 0.3:
                    trap_x = x + random.randint(0, width - 30)
                    trap = Trap(trap_x, y - 10)
                    self.traps.append(trap)
        
        # Place door on the right side of the ground
        self.door = Door(SCREEN_WIDTH - 80, SCREEN_HEIGHT - 100)
        
        # Place key in a reachable location
        self.place_key_reachably()
        
        # Create player at starting position
        self.player = Player(50, SCREEN_HEIGHT - 100)
        
    def place_key_reachably(self):
        # Find all platforms that can be reached
        reachable_platforms = [self.platforms[0]]  # Start with ground
        checked_platforms = set()
        
        while reachable_platforms:
            current_platform = reachable_platforms.pop(0)
            if current_platform in checked_platforms:
                continue
                
            checked_platforms.add(current_platform)
            
            # Check all other platforms
            for platform in self.platforms:
                if platform in checked_platforms:
                    continue
                    
                # Check if platform is reachable from current platform
                if self.can_reach_platform(current_platform, platform):
                    reachable_platforms.append(platform)
        
        # Filter out ground platform for key placement
        key_platforms = [p for p in checked_platforms if p != self.platforms[0]]
        
        if key_platforms:
            # Choose a random reachable platform
            chosen_platform = random.choice(key_platforms)
            # Place key on top of platform
            key_x = chosen_platform.rect.x + chosen_platform.rect.width // 2 - 10
            key_y = chosen_platform.rect.y - 30
            self.key = Key(key_x, key_y)
        else:
            # Fallback: place key on ground
            self.key = Key(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 70)
    
    def can_reach_platform(self, from_platform, to_platform):
        # Calculate horizontal and vertical distances
        dx = abs(to_platform.rect.centerx - from_platform.rect.centerx)
        dy = from_platform.rect.centery - to_platform.rect.centery
        
        # Check if jump distance is possible
        if dx > MAX_JUMP_DISTANCE:
            return False
            
        # Check if height difference is reasonable for a jump
        if dy < -100:  # Too high to jump up
            return False
            
        # Check if platforms are at reasonable heights for falling down
        if dy > 150:  # Too far to fall
            return False
            
        return True
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            elif event.type == pygame.KEYDOWN:
                if self.state == GameState.GAME_OVER:
                    if event.key == pygame.K_r:
                        self.room_number = 1
                        self.state = GameState.PLAYING
                        self.generate_room()
                elif self.state == GameState.NEXT_ROOM:
                    if event.key == pygame.K_SPACE:
                        self.room_number += 1
                        self.state = GameState.PLAYING
                        self.generate_room()
    
    def update(self):
        if self.state == GameState.PLAYING:
            # Handle player input
            keys = pygame.key.get_pressed()
            self.player.vel_x = 0
            
            if keys[pygame.K_LEFT]:
                self.player.vel_x = -PLAYER_SPEED
            if keys[pygame.K_RIGHT]:
                self.player.vel_x = PLAYER_SPEED
                
            # Handle jump input with improved responsiveness
            if keys[pygame.K_SPACE]:
                if not self.player.jump_pressed:  # Just pressed
                    if self.player.on_ground:
                        self.player.jump()
                    self.player.jump_pressed = True
            else:
                self.player.jump_pressed = False
                
            # Update game objects
            self.player.update(self.platforms, self.enemies, self.traps)
            
            for enemy in self.enemies:
                enemy.update()
                
            # Check key collection
            if not self.key.collected:
                player_rect = pygame.Rect(self.player.x, self.player.y, self.player.width, self.player.height)
                if player_rect.colliderect(self.key.rect):
                    self.key.collected = True
                    self.player.has_key = True
                    
            # Check door interaction
            if self.player.has_key:
                player_rect = pygame.Rect(self.player.x, self.player.y, self.player.width, self.player.height)
                if player_rect.colliderect(self.door.rect):
                    self.state = GameState.NEXT_ROOM
                    
            # Check game over
            if not self.player.alive:
                self.state = GameState.GAME_OVER
    
    def draw(self):
        self.screen.fill(BLACK)
        
        # Draw cave background effect
        for i in range(0, SCREEN_WIDTH, 50):
            pygame.draw.line(self.screen, (20, 20, 20), (i, 0), (i, SCREEN_HEIGHT), 1)
        for i in range(0, SCREEN_HEIGHT, 50):
            pygame.draw.line(self.screen, (20, 20, 20), (0, i), (SCREEN_WIDTH, i), 1)
        
        if self.state == GameState.PLAYING:
            # Draw game objects
            for platform in self.platforms:
                platform.draw(self.screen)
                
            for trap in self.traps:
                trap.draw(self.screen)
                
            for enemy in self.enemies:
                enemy.draw(self.screen)
                
            self.key.draw(self.screen)
            self.door.draw(self.screen)
            self.player.draw(self.screen)
            
            # Draw UI
            font = pygame.font.Font(None, 36)
            room_text = font.render(f"Room: {self.room_number}", True, WHITE)
            self.screen.blit(room_text, (10, 10))
            
            if self.player.has_key:
                key_text = font.render("Key Obtained!", True, YELLOW)
                self.screen.blit(key_text, (10, 50))
                
        elif self.state == GameState.GAME_OVER:
            font = pygame.font.Font(None, 72)
            game_over_text = font.render("GAME OVER", True, RED)
            text_rect = game_over_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50))
            self.screen.blit(game_over_text, text_rect)
            
            font_small = pygame.font.Font(None, 36)
            restart_text = font_small.render("Press R to Restart", True, WHITE)
            text_rect = restart_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 50))
            self.screen.blit(restart_text, text_rect)
            
        elif self.state == GameState.NEXT_ROOM:
            font = pygame.font.Font(None, 72)
            complete_text = font.render("ROOM COMPLETE!", True, GREEN)
            text_rect = complete_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50))
            self.screen.blit(complete_text, text_rect)
            
            font_small = pygame.font.Font(None, 36)
            continue_text = font_small.render("Press SPACE for Next Room", True, WHITE)
            text_rect = continue_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 50))
            self.screen.blit(continue_text, text_rect)
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(60)
        
        pygame.quit()

# Run the game
if __name__ == "__main__":
    game = Game()
    game.run()