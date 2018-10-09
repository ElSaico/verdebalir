import cheerio from "cheerio";
import { parseScript } from "esprima";
import request from "request-promise";
import zipObject from "lodash.zipobject";

const responseError = (context, err, message) => {
  const body = { message: message, stacktrace: err };
  context.log.error(message);
  context.log.error(err);
  context.res = { status: 500, body: JSON.stringify(body) };
};

const tickerListOptions = {
  uri: "http://www.fundamentus.com.br/script/cmplte.php",
  transform: body => {
    // this is VERY brittle and assumes the output starts out like this:
    //    window.addEvent('domready', function(){
    // 		  var searchInput = $('completar');
    // 			var tokens = [
    //      ...
    // actually replaceable by a call to http://www.fundamentus.com.br/detalhes.php
    // then query ".resultado td a" and get all text values
    const script = parseScript(body);
    const elements =
      script.body[0].expression.arguments[1].body.body[1].declarations[0].init
        .elements;
    return elements.map(expression => expression.elements[0].value);
  }
};

const parseIndicators = body => {
  const $ = cheerio.load(body);
  const table = $(".conteudo table:nth-of-type(3)");
  const labels = table.find("td.label:nth-child(n+2) .txt").map((_, cell) => cell.innerText);
  const values = table.find("td.data:nth-child(n+3) .txt").map((_, cell) => cell.innerText);
  return zipObject(labels, values);
};

export const getStocks = async context => {
  context.log("Fetching list of stock tickers...");

  let tickers;
  try {
    tickers = await request(tickerListOptions);
  } catch (err) {
    responseError(context, err, "Failure on obtaining stock tickers!");
    return;
  }

  tickers.map(async ticker => {
    let indicators;
    try {
      indicators = await request({
        uri: "http://www.fundamentus.com.br/detalhes.php",
        qs: {papel: ticker},
        transform: parseIndicators
      });
      context.log(indicators);
    } catch (err) {
      responseError(context, err, "Failure on obtaining indicators for stock "+ticker);
    }
  });
};
