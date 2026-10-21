const cls = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
export default cls;
