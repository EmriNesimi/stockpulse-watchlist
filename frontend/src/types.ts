export interface PriceState {
  price: number;
  changePercent: number;
  source: "live" | "simulated";
  history: number[];
}
