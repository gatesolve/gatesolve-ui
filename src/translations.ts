const messages = {
  fi: {
    "Delivery entrance": "Toimitussisäänkäynti",
    "Not for deliveries": "Ei toimituksille",
  },
} as { [locale: string]: { [message: string]: string } | undefined };

// eslint-disable-next-line import/prefer-default-export
export const translate = (message: string, locale: string): string => {
  return messages[locale]?.[message] || message;
};
