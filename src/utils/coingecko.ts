import Coingecko from "@coingecko/coingecko-typescript";

const client = new Coingecko({
  demoAPIKey: process.env.COINGECKO_API,
  environment: "demo",
});

export const fetchPrice = async () => {
  const ethPrice = await client.simple.price.get({
    vs_currencies: "usd",
    ids: "ethereum",
  });

  const nearPrice = await client.simple.price.get({
    vs_currencies: "usd",
    ids: "near",
  });

  return { ethPrice, nearPrice };
};
