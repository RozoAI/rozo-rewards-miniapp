export type Restaurant = {
  _id: string;
  name: string;
  handle: string;
  formatted: string;
  address_line1: string;
  address_line2: string;
  lat: number;
  lon: number;
  payTo?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  logo_url: string;
  cashback_rate: number;
  price?: string;
  distance?: number;
  ns_id?: string;
  is_live?: boolean;
  currency?: string;
  hidden?: boolean;
  // Backend merchant app_id override. Defaults to `pos_${handle}` when absent.
  // Set explicitly for merchants whose backend id doesn't follow that convention
  // (e.g. non-custodial intent-forwarding merchants like `merchant_paper`).
  app_id?: string;
};
