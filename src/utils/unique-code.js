export const generateUniqueCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let idx = 0; idx < length; idx++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
};
