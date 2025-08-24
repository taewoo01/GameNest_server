export const MESSAGES = {
  // 사용자 공통
  REQUIRED_FIELDS: "모든 항목을 입력하세요",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",

  // id 접근성
  INVALID_GAME_ID: "유효하지 않은 게임 ID입니다.",
  INVALID_USER_ID: "유효하지 않은 사용자 ID입니다.",

  // 회원가입
  REGISTER_SUCCESS: "회원가입 성공",

  // 로그인
  LOGIN_SUCCESS: "로그인 성공",
  LOGIN_FAIL: "아이디 또는 비밀번호가 일치하지 않습니다",
  REQUIRED_LOGIN_FIELDS: "아이디와 비밀번호를 입력하세요.",
  WRONG_PASSWORD: "비밀번호가 틀렸습니다.",

  // 아이디 찾기
  REQUIRED_EMAIL_NICKNAME: "이메일과 닉네임을 입력하세요.",

  // 서버
  SERVER_ERROR: "서버 오류",

  // 게임
  GAME_LIST_FETCH_FAIL: "게임 목록을 불러오는 데 실패했습니다.",
  GAME_NOT_FOUND: "게임을 찾을 수 없습니다.",
  CATEGORY_NOT_FOUND: "잘못된 카테고리 타입입니다.",

  // 게임 관련
  GAME_LIKE_ADDED: "찜 추가됨",
  GAME_LIKE_REMOVED: "찜 취소됨",

  // 별점 관련
  RATING_ADDED: "별점 등록됨",
  RATING_UPDATED: "별점 수정됨",
  INVALID_RATING: "별점은 0~5 사이여야 합니다.",
  RATING_SAVE_SUCCESS: "별점 저장 성공",
  INVALID_INPUT: "user_id와 rating이 필요합니다.",

  // 토큰 관련
  UNAUTHORIZED: "토큰이 없습니다.",
  INVALID_TOKEN: "유효하지 않은 토큰입니다.",

  // 정보 수정 관련
  UPDATE_SUCESS: "정보가 성공적으로 업데이트되었습니다.",
  UPDATE_FAIL: "현재 닉네임 또는 이메일이 일치하지 않습니다.",
  REQUIRED_UPDATE_FIELDS: "현재 닉네임과 이메일을 입력해야 합니다.",

  // 비밀번호 변경 관련
  UPDATE_PW_FIELDS: "이전 비밀번호와 새 비밀번호를 입력해주세요.",
  UPDATE_PW_FAIL: "이전 비밀번호가 일치하지 않습니다.",
  UPDATE_PW_SUCESS: "비밀번호가 성공적으로 변경되었습니다.",

  // 비밀번호 찾기 관련
  FIND_PW_FIELDS: "아이디와 이메일을 모두 입력하세요.",
  FIND_PW_FAIL: "아이디 또는 이메일이 잘못되었습니다.",
  FIND_PW_SUCESS: "검증 성공",

  // 게시글 조회
  POST_NOT_FOUND: "게시글을 찾을 수 없습니다.",

  // 글쓰기
  POST_CREATE_SUCCESS: "글 작성 완료",
  INVALID_CATEGORY: "유효하지 않은 카테고리입니다.",
  LOGIN_REQUIRED: "로그인이 필요합니다.",


  // 댓글
  COMMENT_NOT_FOUND: "댓글 조회 실패",
  COMMENT_FIELDS: "댓글 내용을 입력하세요.",
  USER_ONLY_UPDATE: "본인 댓글만 수정 가능합니다.",
  COMMENT_UPDATE_SUCESS: "댓글 수정 완료",
  USER_ONIY_DELETE: "본인 댓글만 삭제 가능합니다.",
  COMMENT_DELETE_SUCESS: "댓글 삭제 완료",
};
