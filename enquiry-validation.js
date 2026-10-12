export const ENQUIRY_SERVICE_LABELS = Object.freeze({
  'virtual-assistance': 'General virtual assistance',
  'social-media-management': 'Social media management',
  'social-media-graphics': 'Social media graphics',
  'website-systems': 'Website & systems',
  'multiple-services': 'A combination of services',
  'not-sure': "I'm not sure yet"
});
export const ENQUIRY_SERVICES = new Set(Object.keys(ENQUIRY_SERVICE_LABELS));
export const ENQUIRY_FIELDS = ['name', 'email', 'business', 'support', 'message'];

// Shared browser/server rules; unknown fields never enter the email payload.
export function validateEnquiry(input = {}) {
  const values = Object.fromEntries(ENQUIRY_FIELDS.map(key => [key, typeof input?.[key] === 'string' ? input[key].trim() : '']));
  const errors = {};
  if (!values.name) errors.name = 'Please enter your name.';
  else if (values.name.length > 100) errors.name = 'Please keep your name within 100 characters.';
  if (!values.email || values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Please enter a valid email address.';
  if (values.business.length > 160) errors.business = 'Please keep the business name within 160 characters.';
  if (!ENQUIRY_SERVICES.has(values.support)) errors.support = 'Please choose a service, or select “I’m not sure yet”.';
  if (!values.message) errors.message = 'Please tell us a little about the work.';
  else if (values.message.length > 2000) errors.message = 'Please keep your message within 2,000 characters.';
  return { values, errors };
}
