import Apify from "apify";
import zipObject from "lodash.zipobject";

const stockUrl = "http://www.fundamentus.com.br/detalhes.php";

export const getStocks = async context => {
  const responseError = (err, message) => {
    const body = { message: message, stacktrace: err };
    context.log.error(message);
    context.log.error(err);
    context.res = { status: 500, body: JSON.stringify(body) };
  };

  Apify.main(async () => {
    context.log("Fetching list of stock tickers...");

    const tickerRequestQueue = await Apify.openRequestQueue();
    const tickerCrawler = new Apify.CheerioCrawler({
      tickerRequestQueue,
      maxRequestsPerCrawl: 100,
      maxConcurrency: 10,
      handlePageFunction: async ({ request, html, $ }) => {
        context.log(`Fetching indicators for stock ${ticker}...`);
        const table = $(".conteudo table:nth-of-type(3)");
        const labels = table
          .find("td.label:nth-child(n+2) .txt")
          .map((_, cell) => $(cell).text())
          .get();
        const values = table
          .find("td.data:nth-child(n+3) .txt")
          .map((_, cell) =>
            $(cell)
              .text()
              .trim()
          )
          .get();
        const indicators = zipObject(labels, values);
        indicators.ticker = ticker;
        await Apify.pushData(indicators);
      },
      handleFailedRequestFunction: async ({ request }) => {
        context.log.error(
          `Failure on obtaining indicators for stock ${ticker}`
        );
      }
    });

    const listRequestList = new Apify.RequestList({
      sources: [{ url: stockUrl }]
    });
    await listRequestList.initialize();
    const listCrawler = new Apify.CheerioCrawler({
      listRequestList,
      handlePageFunction: async ({ request, html, $ }) => {
        $(".resultado td a").map(async (_, a) => {
          const ticker = $(a).text();
          await tickerRequestQueue.addRequest(
            new Apify.Request({ url: stockUrl, qs: { papel: ticker } })
          );
        });
        await tickerCrawler.run();
      },
      handleFailedRequestFunction: async ({ request }) => {
        responseError(request, "Failure on obtaining stock tickers!");
      }
    });

    await listCrawler.run();
  });
};
