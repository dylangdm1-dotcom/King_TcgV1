import type { PokemonCard } from "./types";
export type MarketPrices={cardmarket:number;tcgplayer:number;justtcg:number;ebay:number;average:number;priceTrend7d:number;priceTrend30d:number;minimum?:number;maximum?:number;validSourceCount:number};
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)&&x>0?x:0};
const quote=(card:PokemonCard|undefined|null,source:string)=>card?.marketQuotes?.find(q=>q.source===source&&q.compatible)?.price||0;
export const CONDITION_COEFFICIENTS:Record<string,number>={Mint:1,"Near Mint":1,Excellent:1,Good:1,"Light Played":1,Played:1,Poor:1};
export function getAdjustedPriceByCondition(v:number,_c="Near Mint"){return n(v)}
export function getCardMarketPrice(c?:PokemonCard|null){return Number((quote(c,"tcggo")||quote(c,"cardmarket")).toFixed(2))}
export function getCardMarketLowPrice(c?:PokemonCard|null){return getCardMarketPrice(c)}
export function getTCGPlayerPrice(c?:PokemonCard|null){return Number(quote(c,"tcgplayer").toFixed(2))}
export function getJustTcgPrice(c?:PokemonCard|null){return Number(quote(c,"justtcg").toFixed(2))}
export function getEbayPrice(c?:PokemonCard|null){return Number(quote(c,"ebay").toFixed(2))}
export function getAverageMarketPrice(c?:PokemonCard|null){return n(c?.marketEstimate?.price)}
const vals=(c?:PokemonCard|null)=>c?.marketQuotes?.filter(q=>q.compatible&&q.language===c.dataLanguage).map(q=>q.price).filter(v=>v>0)||[];
export function getMinimumMarketPrice(c?:PokemonCard|null){const v=vals(c);return v.length?Math.min(...v):0}
export function getMaximumMarketPrice(c?:PokemonCard|null){const v=vals(c);return v.length?Math.max(...v):0}
export function getPriceTrend7d(){return 0}export function getPriceTrend30d(){return 0}
export function getMarketSpread(c?:PokemonCard|null){const v=vals(c);return v.length>1?Number((Math.max(...v)-Math.min(...v)).toFixed(2)):0}
export function getMarketData(c?:PokemonCard|null):MarketPrices{return{cardmarket:getCardMarketPrice(c),tcgplayer:getTCGPlayerPrice(c),justtcg:getJustTcgPrice(c),ebay:getEbayPrice(c),average:getAverageMarketPrice(c),priceTrend7d:0,priceTrend30d:0,minimum:getMinimumMarketPrice(c),maximum:getMaximumMarketPrice(c),validSourceCount:vals(c).length}}
export function getMarketGrowth(c?:PokemonCard|null,buy=0,condition="Near Mint"){const current=getAdjustedPriceByCondition(getAverageMarketPrice(c),condition);return buy>0&&current>0?Number((((current-buy)/buy)*100).toFixed(1)):0}
