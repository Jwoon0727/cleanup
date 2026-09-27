/**
 * 체크박스 input 의 name 규칙.
 * Server Action 파일은 async 함수만 export 할 수 있으므로 여기에 둔다.
 */
export const checklistFieldName = (itemId: string) => `item__${itemId}`;
