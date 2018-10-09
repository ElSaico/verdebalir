import cheerio from "cheerio";
import { parseScript } from "esprima";
import request from "request-promise";

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
    const script = parseScript(body);
    const elements =
      script.body[0].expression.arguments[1].body.body[1].declarations[0].init
        .elements;
    return elements.map(expression => expression.elements[0].value);
  }
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
};
