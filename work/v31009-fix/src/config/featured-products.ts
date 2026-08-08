import p1 from '../pkgShop/products/p1.jpg';
import p2 from '../pkgShop/products/p2.jpg';
import p3 from '../pkgShop/products/p3.jpg';
import p4 from '../pkgShop/products/p4.jpg';
import p5 from '../pkgShop/products/p5.jpg';
import p6 from '../pkgShop/products/p6.jpg';

export interface FeaturedSpec {
  name: string;
  price: number;
  stock: number;
}

export interface FeaturedProduct {
  id: number;
  name: string;
  shortName: string;
  category: string;
  origin: string;
  image: string;
  tag: string;
  sales: number;
  shop: string;
  delivery: string;
  desc: string;
  specs: FeaturedSpec[];
  trace: Array<{ step: string; info: string }>;
}

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: 1,
    name: '天津市蓟州区老曲庄村传统面点礼盒',
    shortName: '老曲庄村传统面点礼盒',
    category: '米面',
    origin: '天津市蓟州区老曲庄村',
    image: p1,
    tag: '村集体优选',
    sales: 286,
    shop: '天津市蓟州区老曲庄村供销服务站',
    delivery: '村级服务站发货 · 支持配送 / 自提',
    desc: '传统工艺制作，适合家庭早餐与节庆送礼。平台展示供货主体、价格、库存和履约进度，交易全程留痕。',
    specs: [
      { name: '1 盒装', price: 59.6, stock: 46 },
      { name: '2 盒装', price: 116, stock: 22 },
    ],
    trace: [
      { step: '🏘️ 供货主体', info: '天津市蓟州区老曲庄村集体合作供货' },
      { step: '📋 入库检验', info: '批次外观、包装、保质期核验合格' },
      { step: '📦 履约发货', info: '订单确认后由村级服务站统一配货' },
    ],
  },
  {
    id: 2,
    name: '天津市蓟州区桑梓镇传统豆片',
    shortName: '桑梓镇传统豆片',
    category: '特产',
    origin: '天津市蓟州区桑梓镇',
    image: p2,
    tag: '产地直供',
    sales: 198,
    shop: '天津市蓟州区桑梓镇供销服务站',
    delivery: '产地直发 · 支持配送 / 自提',
    desc: '选用大豆制作，口感筋道，适合家常凉拌、炒制和涮食。每批次记录供货、入库和销售去向。',
    specs: [
      { name: '4 袋装', price: 42, stock: 58 },
      { name: '8 袋装', price: 80, stock: 31 },
    ],
    trace: [
      { step: '🌱 原料', info: '大豆原料与生产批次登记' },
      { step: '🏭 加工', info: '天津市蓟州区桑梓镇传统工艺制作' },
      { step: '✅ 验收', info: '包装、日期和数量经服务站验收' },
    ],
  },
  {
    id: 3,
    name: '天津市蓟州区柳子口村黑猪肉礼盒',
    shortName: '柳子口村黑猪肉礼盒',
    category: '生鲜',
    origin: '天津市蓟州区柳子口村',
    image: p3,
    tag: '冷链配送',
    sales: 126,
    shop: '天津市蓟州区柳子口村助农合作社',
    delivery: '冷链配送 · 到货验收',
    desc: '村级合作社组织供应，按批次登记养殖、检验、分割和冷链履约信息。生鲜商品以实际称重和验收结果为准。',
    specs: [
      { name: '5 斤礼盒', price: 300, stock: 18 },
      { name: '10 斤家庭装', price: 580, stock: 9 },
    ],
    trace: [
      { step: '🐖 养殖', info: '天津市蓟州区柳子口村合作农户养殖' },
      { step: '🧪 检验', info: '入库前查验动物检疫与产品合格凭证' },
      { step: '❄️ 冷链', info: '分割包装后全程冷链配送' },
    ],
  },
  {
    id: 4,
    name: '天津市西青区辛口镇小沙窝村沙窝萝卜',
    shortName: '小沙窝村沙窝萝卜',
    category: '生鲜',
    origin: '天津市西青区辛口镇小沙窝村',
    image: p4,
    tag: '一村一品',
    sales: 352,
    shop: '天津市西青区小沙窝村集体合作社',
    delivery: '产地分拣 · 次日配送',
    desc: '天津特色农产品，产地分拣后按订单配货。页面如实展示规格、库存与供货主体，避免货不对板。',
    specs: [
      { name: '5 斤装', price: 28, stock: 76 },
      { name: '10 斤装', price: 50, stock: 40 },
    ],
    trace: [
      { step: '🌱 种植', info: '天津市西青区辛口镇小沙窝村种植基地' },
      { step: '⚖️ 分拣', info: '按大小、外观和重量统一分拣' },
      { step: '🚚 配送', info: '服务站集中配货，支持到站自提' },
    ],
  },
  {
    id: 5,
    name: '天津市东丽区华明街道胡张庄村葡萄礼盒',
    shortName: '胡张庄村葡萄礼盒',
    category: '水果',
    origin: '天津市东丽区华明街道胡张庄村',
    image: p5,
    tag: '本地鲜果',
    sales: 214,
    shop: '天津东丽华明范庄·集体自营',
    delivery: '同城配送 · 服务站自提',
    desc: '由天津东丽华明片区服务站组织展示和履约，鲜果按成熟度分批上架，售罄后不超卖。',
    specs: [
      { name: '2.5 公斤礼盒', price: 150, stock: 24 },
      { name: '5 公斤家庭装', price: 286, stock: 12 },
    ],
    trace: [
      { step: '🍇 采摘', info: '天津市东丽区华明街道胡张庄村采摘' },
      { step: '📦 包装', info: '按成熟度分拣，礼盒防碰包装' },
      { step: '🏪 履约', info: '天津东丽华明范庄服务站组织配送' },
    ],
  },
  {
    id: 6,
    name: '天津市东丽区军粮城街道优选大米',
    shortName: '军粮城优选大米',
    category: '米面',
    origin: '天津市东丽区军粮城街道',
    image: p6,
    tag: '供销优选',
    sales: 405,
    shop: '天津市东丽区军粮城供销服务站',
    delivery: '仓配直发 · 支持配送 / 自提',
    desc: '日常家庭用米，供货价格、批次、库存与订单履约统一纳入平台台账，方便居民复购和村社监督。',
    specs: [
      { name: '5 公斤装', price: 50, stock: 88 },
      { name: '10 公斤装', price: 96, stock: 52 },
    ],
    trace: [
      { step: '🌾 供货', info: '天津市东丽区军粮城供销渠道组织供货' },
      { step: '📋 入库', info: '核验生产日期、保质期和包装完整性' },
      { step: '📦 出库', info: '订单分拣复核后出库，全程可查' },
    ],
  },
];

export const FEATURED_CATEGORIES = ['全部', '生鲜', '水果', '米面', '特产'];

export const featuredProductById = (id: number) =>
  FEATURED_PRODUCTS.find(product => product.id === id) || FEATURED_PRODUCTS[0];
