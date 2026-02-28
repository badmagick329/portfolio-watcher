const paperUrl = 'https://demo.trading212.com/api/v0';
const liveUrl = 'https://live.trading212.com/api/v0';

const endPoints = {
  accountCash: `${liveUrl}/equity/account/cash`,
  accountSummary: `${liveUrl}/equity/account/summary`,
};

export { endPoints };
