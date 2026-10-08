// สระหน้าของไทย (เขียนก่อนพยัญชนะ) เช่น "เจ" ถ้าเอาตัวแรกตรง ๆ จะได้ "เ" ซึ่งไม่สื่อว่าเป็นใคร
const THAI_LEADING_VOWELS = /^[เแโใไ]+/;

// อักษรแรกของชื่อสำหรับแสดงในวงกลม: ข้ามสระหน้าไปเอาพยัญชนะ / ภาษาอังกฤษเป็นตัวพิมพ์ใหญ่
// ใช้ Array.from ตัดทีละตัวอักษร (code point) ไม่ให้วรรณยุกต์/สระบนล่างติดมาด้วย
export const getNameInitial = (name: string) => {
  const trimmedName = name.trim();
  const nameWithoutLeadingVowel = trimmedName.replace(THAI_LEADING_VOWELS, "") || trimmedName;
  const firstCharacter = Array.from(nameWithoutLeadingVowel)[0];
  return firstCharacter ? firstCharacter.toUpperCase() : "?";
};
