export interface User {
  id?: number; 
  user_login_id: string;
  user_password: string;
  user_nickname: string;
  user_email: string;
  user_created_at?: Date;
  user_updated_at?: Date;
}

export interface DetailQuery {
  user_id?: string; // 쿼리라서 string 타입
};