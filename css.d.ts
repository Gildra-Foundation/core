// Типы CSS-модулей для отдельной проверки движка (в приложении их даёт Next.js).
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.css';
