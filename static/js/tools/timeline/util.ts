/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import axios from "axios";

export const statVarSep = "__";
export const placeSep = ",";

export interface TokenInfo {
  name: string;
  sep: string;
  tokens: Set<string>;
}

export function getPlaceNames(
  dcids: string[]
): Promise<{ [key: string]: string }> {
  let url = "/api/place/name?";
  const urls = [];
  for (const place of dcids) {
    urls.push(`dcid=${place}`);
  }
  url += urls.join("&");
  return axios.get(url).then((resp) => {
    return resp.data;
  });
}

export function getTokensFromUrl(name: string, sep: string): Set<string> {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  const tokenString = urlParams.get(name);
  let tokens: Set<string> = new Set();
  if (tokenString) {
    tokens = new Set(tokenString.split(sep));
  }
  return tokens;
}

export function setTokensToUrl(tokens: TokenInfo[]): void {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  for (const token of tokens) {
    urlParams.set(token.name, Array.from(token.tokens).join(token.sep));
  }
  window.location.hash = urlParams.toString();
}

// Add a token to the url. A token could either be a place dcid, a stat var or
// a [stat var,denominator] pair separated by comma.
export function addToken(name: string, sep: string, token: string): void {
  const tokens = getTokensFromUrl(name, sep);
  if (tokens.has(token)) {
    return;
  }
  tokens.add(token);
  setTokensToUrl([{ name, sep, tokens }]);
}

// Remove a token from the url.
export function removeToken(name: string, sep: string, token: string): void {
  const tokens = getTokensFromUrl(name, sep);
  if (!tokens.has(token)) {
    return;
  }
  tokens.delete(token);
  setTokensToUrl([{ name, sep, tokens }]);
}

// set PerCapita for a chart
export function setChartPerCapita(mprop: string, pc: boolean): void {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  let chartOptions = JSON.parse(urlParams.get("chart"));
  if (!chartOptions) {
    chartOptions = {};
  }
  chartOptions[mprop] = pc;
  urlParams.set("chart", JSON.stringify(chartOptions));
  if (!pc) {
    // "&pc" means per capita for all charts.
    urlParams.delete("pc");
  }
  window.location.hash = urlParams.toString();
}

export function getChartPerCapita(mprop: string): boolean {
  const urlParams = new URLSearchParams(window.location.hash.split("#")[1]);
  if (urlParams.get("pc")) {
    return true;
  }
  const chartOptions = JSON.parse(urlParams.get("chart"));
  if (!chartOptions) {
    return false;
  }
  if (mprop in chartOptions) {
    return chartOptions[mprop];
  }
  return false;
}
