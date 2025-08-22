export interface Game {
    id?: number; // Auto-increment, optional for creation
    game_title: string;
    game_thumbnail: string;
    game_description: string;
    game_story: string;
    game_release_date: Date;
    game_developer: string;
    game_publisher: string;
    game_platforms: string[]; // JSON 배열로 파싱됨
    game_modes: string[];
    game_tags: string[];
    game_media: JSON // 예: 이미지나 동영상 URL들
    game_created_at?: Date;
    game_updated_at?: Date;
  }
  