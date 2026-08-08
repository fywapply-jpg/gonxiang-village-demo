import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Image, Video, Swiper, SwiperItem, Input } from '@tarojs/components';
import { store, Order } from '../../store';
import { VILLAGE_STORE } from '../../config/region';
import villageBanner from '../../assets/village-banner.jpg';
import TabBar from '../../components/TabBar';
import { PRODUCT_IMG } from '../product-images';
import './index.css';

interface MyProduct { id: number; name: string; emoji: string; price: number; unit: string; stock: number; sold: number; on: boolean; cat?: 'guoyang' | 'cunli' | 'youpin'; images?: string[]; videoUrl?: string; }
const INIT: MyProduct[] = [
  { id: 1, name: '蓟州老曲庄村面点', emoji: '🥟', price: 59.6, unit: '礼盒(豆沙包 蛋黄包)', stock: 67, sold: 33, on: true },
  { id: 2, name: '蓟州桑梓豆片', emoji: '🧈', price: 42, unit: '礼盒(3斤)', stock: 84, sold: 46, on: true },
  { id: 3, name: '蓟州柳子口黑猪肉', emoji: '🥩', price: 300, unit: '礼盒(10斤)', stock: 101, sold: 59, on: true },
  { id: 4, name: '小沙窝村沙窝萝卜（天星2号）', emoji: '🥕', price: 50, unit: '礼盒(10斤)', stock: 118, sold: 72, on: true },
  { id: 5, name: '华明街胡张庄黄金香印葡萄', emoji: '🍇', price: 150, unit: '礼盒(5斤)', stock: 135, sold: 85, on: true },
  { id: 6, name: '军粮城镇大米', emoji: '🌾', price: 50, unit: '礼盒(十斤)', stock: 152, sold: 98, on: true },
  { id: 7, name: '华明永和村蔬菜礼包', emoji: '🥬', price: 150, unit: '箱(绿叶菜4-5公斤 果菜1.5-2', stock: 169, sold: 111, on: true },
  { id: 8, name: '小沙窝冰激凌萝卜', emoji: '🥕', price: 60, unit: '箱(十斤)', stock: 186, sold: 124, on: true },
  { id: 9, name: '蓟州二十里铺红香酥梨', emoji: '🍐', price: 60, unit: '箱(十斤)', stock: 53, sold: 137, on: true },
  { id: 10, name: '华明永和村小站稻', emoji: '🌾', price: 28, unit: '(5斤)', stock: 70, sold: 150, on: true },
  { id: 11, name: '华明赤土村魏记（扣肉）', emoji: '🍖', price: 28, unit: '1袋', stock: 87, sold: 163, on: true },
  { id: 12, name: '华明赤土村魏记（水溜丸子）', emoji: '🍢', price: 28, unit: '1袋', stock: 104, sold: 176, on: true },
  { id: 13, name: '华明赤土村魏记（四喜丸子）', emoji: '🍢', price: 28, unit: '1袋', stock: 121, sold: 189, on: true },
  { id: 14, name: '华明赤土村魏记（猪蹄）', emoji: '🍖', price: 34, unit: '1袋', stock: 138, sold: 22, on: true },
  { id: 15, name: '华明赤土村魏记（猪耳朵）', emoji: '🍖', price: 34, unit: '1袋', stock: 155, sold: 35, on: true },
  { id: 16, name: '华明赤土村魏记礼盒装（4个扣肉+2个水溜丸子+2个四喜丸子+1个猪蹄儿+1个猪耳朵）', emoji: '🍖', price: 292, unit: '1箱', stock: 172, sold: 48, on: true },
  { id: 17, name: '西青区白塔寺村白灵菇', emoji: '🍄', price: 40, unit: '箱', stock: 189, sold: 61, on: true },
  { id: 18, name: '蔬菜箱', emoji: '🥬', price: 120, unit: '(17-20斤左右)箱', stock: 56, sold: 74, on: true },
  { id: 19, name: '华明青口蜜', emoji: '🍯', price: 20, unit: '1斤', stock: 73, sold: 87, on: true },
  { id: 20, name: '华明欢陀铁皮西红柿', emoji: '🍅', price: 100, unit: '10斤', stock: 90, sold: 100, on: true },
  { id: 21, name: '华明红颜草莓', emoji: '🍓', price: 80, unit: '4斤', stock: 107, sold: 113, on: true },
  { id: 22, name: '2020赤霞珠干红葡萄酒', emoji: '🍷', price: 118, unit: '750ml*瓶', stock: 124, sold: 126, on: true },
  { id: 23, name: '2020窖藏干红葡萄酒', emoji: '🍷', price: 168, unit: '750ml*瓶', stock: 141, sold: 139, on: true },
  { id: 24, name: '2021赤霞珠干红葡萄酒', emoji: '🍷', price: 110, unit: '750ml*瓶', stock: 158, sold: 152, on: true },
  { id: 25, name: '2021玫瑰香葡萄酒（半甜型）', emoji: '🍷', price: 80, unit: '500ml*瓶', stock: 175, sold: 165, on: true },
  { id: 26, name: '2021玫瑰香葡萄酒（半甜型）', emoji: '🍷', price: 118, unit: '750ml*瓶', stock: 192, sold: 178, on: true },
  { id: 27, name: '2022玫瑰香葡萄酒（甜型）', emoji: '🍷', price: 118, unit: '750ml*瓶', stock: 59, sold: 191, on: true },
  { id: 28, name: '玫瑰香葡萄酒', emoji: '🍷', price: 80, unit: '500ml', stock: 76, sold: 24, on: true },
  { id: 29, name: '2019年窖藏干红葡萄酒', emoji: '🍷', price: 168, unit: '750ml*瓶', stock: 93, sold: 37, on: true },
  { id: 30, name: '珍藏老酒', emoji: '🍶', price: 498, unit: '500ml*4瓶', stock: 110, sold: 50, on: true },
  { id: 31, name: '窖藏老酒', emoji: '🍶', price: 268, unit: '500ml*6瓶', stock: 127, sold: 63, on: true },
  { id: 32, name: '前园子纯粮白酒礼盒', emoji: '🍶', price: 288, unit: '125ml*5瓶', stock: 144, sold: 76, on: true },
  { id: 33, name: '特酿', emoji: '🍶', price: 168, unit: '500ml*6瓶', stock: 161, sold: 89, on: true },
  { id: 34, name: '纯酿', emoji: '🍶', price: 138, unit: '500ml*6瓶', stock: 178, sold: 102, on: true },
  { id: 35, name: '福酒', emoji: '🍶', price: 19.9, unit: '100ml/瓶', stock: 195, sold: 115, on: true },
  { id: 36, name: '云南茯苓红糖', emoji: '🍵', price: 65.9, unit: '180g(15g*12g)', stock: 62, sold: 128, on: true },
  { id: 37, name: '云南红糖姜茶', emoji: '🍵', price: 45.9, unit: '180g(15g*12g)', stock: 79, sold: 141, on: true },
  { id: 38, name: '云南黄精红糖', emoji: '🍵', price: 76.9, unit: '180g(15g*12g)', stock: 96, sold: 154, on: true },
  { id: 39, name: '菜瓜', emoji: '🥒', price: 9.9, unit: '5斤', stock: 113, sold: 167, on: true },
  { id: 40, name: '两色小柿子', emoji: '🍅', price: 14.9, unit: '6斤', stock: 130, sold: 180, on: true },
  { id: 41, name: '油桃', emoji: '🍑', price: 16.9, unit: '4斤', stock: 147, sold: 193, on: true },
  { id: 42, name: '五彩西红柿', emoji: '🍅', price: 12.9, unit: '1斤', stock: 164, sold: 26, on: true },
  { id: 43, name: '汉沽  芦花食用生态海盐', emoji: '🧂', price: 0.75, unit: '400g/袋', stock: 181, sold: 39, on: true },
  { id: 44, name: '汉沽  芦花天然食用海盐', emoji: '🧂', price: 0.89, unit: '400g/袋', stock: 198, sold: 52, on: true },
  { id: 45, name: '汉沽  食用中厨罐装海盐', emoji: '🧂', price: 4.79, unit: '450g/罐', stock: 65, sold: 65, on: true },
  { id: 46, name: '华明本地土豆', emoji: '🫘', price: 6.5, unit: '4斤', stock: 82, sold: 78, on: true },
  { id: 47, name: '家爱格可生食鸡蛋', emoji: '🥚', price: 15.9, unit: '15枚', stock: 99, sold: 91, on: true },
  { id: 48, name: '家爱格可生食鸡蛋', emoji: '🥚', price: 29.9, unit: '30枚', stock: 116, sold: 104, on: true },
  { id: 49, name: '宝坻郝各庄秃噜粉条', emoji: '🍜', price: 31.8, unit: '2斤', stock: 133, sold: 117, on: true },
  { id: 50, name: '蓟州上仓禹道菊苣', emoji: '🥬', price: 175, unit: '礼盒(5斤)', stock: 150, sold: 130, on: true },
  { id: 51, name: '宁河大北涧沽大米', emoji: '🌾', price: 49.8, unit: '袋(十斤)', stock: 167, sold: 143, on: true },
  { id: 52, name: '宝坻大五登村玉米面', emoji: '🌽', price: 23.5, unit: '袋(5斤)', stock: 184, sold: 156, on: true },
  { id: 53, name: '宝坻大五登村八宝窝头面', emoji: '🥟', price: 30, unit: '袋(5斤)', stock: 51, sold: 169, on: true },
  { id: 54, name: '宝坻大五登村白玉米面', emoji: '🌽', price: 27.5, unit: '袋(5斤)', stock: 68, sold: 182, on: true },
  { id: 55, name: '宝坻大五登村玉米渣', emoji: '🌽', price: 23.5, unit: '袋(5斤)', stock: 85, sold: 195, on: true },
  { id: 56, name: '宝坻喜笑辣妹', emoji: '🌶️', price: 57, unit: '香辣酱(150g*6瓶)', stock: 102, sold: 28, on: true },
  { id: 57, name: '宝坻喜笑辣妹', emoji: '🌶️', price: 13.9, unit: '香辣酥(248g袋)', stock: 119, sold: 41, on: true },
  { id: 58, name: '河北省大名县五鹿香', emoji: '🛒', price: 11.5, unit: '白芝麻小磨香油(100ml瓶)', stock: 136, sold: 54, on: true },
  { id: 59, name: '河北省大名县五鹿香', emoji: '🛒', price: 21.9, unit: '白芝麻小磨香油(210ml瓶)', stock: 153, sold: 67, on: true },
  { id: 60, name: '河北省大名县五鹿香', emoji: '🛒', price: 29.3, unit: '白芝麻小磨香油(400ml瓶)', stock: 170, sold: 80, on: true },
  { id: 61, name: '河北省大名县五鹿香', emoji: '🛒', price: 23, unit: '黑芝麻小磨香油(210ml瓶)', stock: 187, sold: 93, on: true },
  { id: 62, name: '河北省大名县五鹿香', emoji: '🛒', price: 33.8, unit: '黑芝麻小磨香油(400ml瓶)', stock: 54, sold: 106, on: true },
  { id: 63, name: '河北省大名县五鹿香', emoji: '🛒', price: 26, unit: '黑芝麻酱(350g瓶)', stock: 71, sold: 119, on: true },
  { id: 64, name: '河北省大名县五鹿香', emoji: '🛒', price: 12.8, unit: '白芝麻酱(256g瓶)', stock: 88, sold: 132, on: true },
  { id: 65, name: '河北省大名县五鹿香', emoji: '🛒', price: 17.3, unit: '白芝麻酱(350g瓶)', stock: 105, sold: 145, on: true },
  { id: 66, name: '河北省大名县五鹿香', emoji: '🛒', price: 75, unit: '白芝麻香油礼盒(180ml*4瓶)', stock: 122, sold: 158, on: true },
  { id: 67, name: '河北省大名县五鹿香', emoji: '🛒', price: 95, unit: '黑芝麻香油礼盒(210ml*4瓶)', stock: 139, sold: 171, on: true },
  { id: 68, name: '河北省大名县五鹿香', emoji: '🛒', price: 168, unit: '精品组合装275ml/2瓶(芝麻油)', stock: 156, sold: 184, on: true },
  { id: 69, name: '河北省大名县五鹿香', emoji: '🛒', price: 68, unit: '芝麻酱礼盒(256g/4瓶)', stock: 173, sold: 197, on: true },
  { id: 70, name: '河北省大名县五鹿香', emoji: '🛒', price: 70, unit: '组合装礼盒180ml/2瓶(芝麻油)', stock: 190, sold: 30, on: true },
  { id: 71, name: '甘肃皋兰', emoji: '🛒', price: 78, unit: '兰州冬果梨(冻梨)(258g*6碗/', stock: 57, sold: 43, on: true },
  { id: 72, name: '甘肃皋兰', emoji: '🛒', price: 78, unit: '兰州冬果梨(百合)(258g*6碗/', stock: 74, sold: 56, on: true },
  { id: 73, name: '甘肃皋兰', emoji: '🛒', price: 78, unit: '兰州玫瑰桃胶(258g*6碗/小金碗', stock: 91, sold: 69, on: true },
  { id: 74, name: '甘肃皋兰', emoji: '🛒', price: 366, unit: '高原佛跳墙(228g*6碗/小金碗罐', stock: 108, sold: 82, on: true },
  { id: 75, name: '甘肃皋兰', emoji: '🛒', price: 89, unit: '冬果梨膏(370g/1盒)', stock: 125, sold: 95, on: true },
  { id: 76, name: '甘肃皋兰', emoji: '🛒', price: 68, unit: '沙漠梨膏 (270g/1盒)', stock: 142, sold: 108, on: true },
  { id: 77, name: '甘肃皋兰', emoji: '🛒', price: 15, unit: '兰州冬果梨(小金碗罐头258g*碗)', stock: 159, sold: 121, on: true },
  { id: 78, name: '甘肃皋兰', emoji: '🛒', price: 15, unit: '兰州百合羹(小金碗罐头258g*碗)', stock: 176, sold: 134, on: true },
  { id: 79, name: '甘肃皋兰', emoji: '🛒', price: 15, unit: '兰州玫瑰桃胶(小金碗罐头258g*碗', stock: 193, sold: 147, on: true },
  { id: 80, name: '云南蔗香红糖', emoji: '🍵', price: 42.9, unit: '180g(15g*12g)', stock: 60, sold: 160, on: true },
  { id: 81, name: '桂顺斋饼干（牛奶味）', emoji: '🍪', price: 9.9, unit: '536g*盒', stock: 77, sold: 173, on: true },
  { id: 82, name: '江米条', emoji: '🍪', price: 9.9, unit: '280g*袋', stock: 94, sold: 186, on: true },
  { id: 83, name: '沙琪玛(原味)', emoji: '🍪', price: 9.9, unit: '496g*袋', stock: 111, sold: 199, on: true },
  { id: 84, name: '海岛福蛋卷(斑斓味)', emoji: '🍪', price: 9.9, unit: '120g*盒', stock: 128, sold: 32, on: true },
  { id: 85, name: '海岛福蛋卷（原味）', emoji: '🍪', price: 9.9, unit: '120g*盒', stock: 145, sold: 45, on: true },
  { id: 86, name: '家爱格鸡蛋', emoji: '🥚', price: 9.9, unit: '15枚', stock: 162, sold: 58, on: true },
  { id: 87, name: '家爱格鸡蛋', emoji: '🥚', price: 17.9, unit: '30枚', stock: 179, sold: 71, on: true },
  { id: 88, name: '家爱格鸡蛋', emoji: '🥚', price: 169.9, unit: '360枚', stock: 196, sold: 84, on: true },
  { id: 89, name: '家爱格富硒鸡蛋', emoji: '🥚', price: 10.9, unit: '15枚', stock: 63, sold: 97, on: true },
  { id: 90, name: '家爱格鸡蛋', emoji: '🥚', price: 19.9, unit: '118枚', stock: 80, sold: 110, on: true },
  { id: 91, name: '家爱格鸡蛋', emoji: '🥚', price: 189.9, unit: '193枚', stock: 97, sold: 123, on: true },
  { id: 92, name: '麻酱鸡蛋', emoji: '🥚', price: 9.9, unit: '10/20/30', stock: 114, sold: 136, on: true },
  { id: 93, name: '柴鸡蛋', emoji: '🥚', price: 11.9, unit: '10个', stock: 131, sold: 149, on: true },
  { id: 94, name: '山楂五黑糕', emoji: '🍰', price: 19.9, unit: '248g*袋', stock: 148, sold: 162, on: true },
  { id: 95, name: '蜂蜜', emoji: '🍯', price: 29.9, unit: '500g', stock: 165, sold: 175, on: true },
  { id: 96, name: '花旗果茶', emoji: '🍵', price: 45.9, unit: '360ml*12瓶/400ml*12', stock: 182, sold: 188, on: true },
  { id: 97, name: '拇指玉米', emoji: '🌽', price: 88, unit: '2kg*箱', stock: 199, sold: 21, on: true },
];

// 党支部确认的党员商户（商品/店铺展示党员标识 + 享党员待遇）；真实版由名册党员×商户关联生成
const PARTY_MERCHANTS = new Set<number>([1, 3, 6, 11, 47, 50]);
const isPartyMerchant = (id: number) => PARTY_MERCHANTS.has(id);

// ── 供享大集：附近多家小卖部聚合（买家视角）。每个商品按产地/品类归到一家店，店有星级 ──
interface Shop { name: string; star: number; tag: string; }
const SHOPS: Record<string, Shop> = {
  ziying:      { name: VILLAGE_STORE, star: 5.0, tag: '集体自营 · 党建优选' },
  laoquzhuang: { name: '蓟州老曲庄合作社', star: 4.9, tag: '党员商户 · 非遗面点' },
  weiji:       { name: '华明赤土魏记熟食', star: 4.8, tag: '老字号 · 卤味熟食' },
  jiaaige:     { name: '家爱格蛋品', star: 4.7, tag: '可生食 · 鲜鸡蛋' },
  yunnan:      { name: '云南甜坊', star: 4.7, tag: '古法 · 手作红糖' },
  wuluxiang:   { name: '大名五鹿香', star: 4.6, tag: '小磨香油世家' },
  huaming:     { name: '华明果蔬园', star: 4.6, tag: '当季 · 鲜果时蔬' },
  gaolan:      { name: '皋兰陇小味', star: 4.5, tag: '兰州 · 高原特产' },
  jiuzuo:      { name: '范庄酒坊', star: 4.4, tag: '纯粮 · 传统酿造' },
};
const shopOf = (p: MyProduct): Shop => {
  const n = p.name;
  if (p.cat === 'youpin' || p.cat === 'guoyang') return SHOPS.ziying;
  if (/老曲庄|桑梓|柳子口|上仓|二十里铺/.test(n)) return SHOPS.laoquzhuang;
  if (/魏记/.test(n)) return SHOPS.weiji;
  if (/家爱格|鸡蛋/.test(n)) return SHOPS.jiaaige;
  if (/五鹿香/.test(n)) return SHOPS.wuluxiang;
  if (/皋兰/.test(n)) return SHOPS.gaolan;
  if (/云南|红糖/.test(n)) return SHOPS.yunnan;
  if (/葡萄酒|老酒|白酒|特酿|纯酿|福酒|前园子/.test(n)) return SHOPS.jiuzuo;
  return SHOPS.huaming;
};
const SHOP_COUNT = Object.keys(SHOPS).length; // 供享大集入驻商家数
// 按品类给出功效与营养介绍（商品详情展示）
const efficacyOf = (p: MyProduct): string => {
  const n = p.name;
  if (p.cat === 'guoyang') return '国标品质、规范生产，正品溯源，适合日常农事生产与家庭使用，省心可靠。';
  if (/鸡蛋/.test(n)) return '优质蛋白来源，氨基酸均衡，可生食级别更显新鲜，适合老人小孩日常营养补充。';
  if (/肉|猪|扣肉|丸子|猪蹄|猪耳/.test(n)) return '肉质紧实鲜香、蛋白质丰富，传统工艺、地道风味，适合家庭滋补与年节宴请。';
  if (/葡萄|梨|草莓|柿子|桃|香印|黄金/.test(n)) return '当季鲜果，富含维生素C与膳食纤维，清甜多汁、生津开胃，老少皆宜。';
  if (/菜|萝卜|菇|土豆|菊苣|西红柿|番茄/.test(n)) return '新鲜时蔬，膳食纤维丰富、水分充足，清淡爽口、营养均衡，日常餐桌好搭配。';
  if (/米|面|玉米|粉|窝头|稻/.test(n)) return '优质主粮，颗粒饱满、口感软糯，膳食能量来源，蒸煮皆宜的主食好选择。';
  if (/红糖|蜂蜜|糖|梨膏/.test(n)) return '古法熬制、温润滋补，可冲饮可入膳，暖身润燥，四季皆宜的天然甜味。';
  if (/酒/.test(n)) return '纯粮酿造、醇厚绵香，酒体干净、回味悠长，佐餐宴客、馈赠亲友皆相宜。';
  if (/油|芝麻|香油/.test(n)) return '小磨工艺、香气浓郁，凉拌热炒皆提味，一滴增香，厨房必备的地道好味。';
  if (/盐/.test(n)) return '天然生态海盐，颗粒纯净、咸味柔和，日常烹饪调味的健康之选。';
  return '产地直供、新鲜天然，党支部品控担保，品质可溯源、吃得放心。';
};
// 买家排序维度
const SORTS = [['default', '综合'], ['sold', '销量'], ['priceAsc', '价格↑'], ['priceDesc', '价格↓'], ['star', '口碑']] as const;
type SortKey = typeof SORTS[number][0];

// 国央企好物（工业品/农资下行 · 国企背书直采直供）
const GUOYANG: MyProduct[] = [
  { id: 1001, name: '中粮·复合肥 45%', emoji: '🧪', price: 135, unit: '40kg/袋', stock: 500, sold: 860, on: true, cat: 'guoyang' },
  { id: 1002, name: '中农·郑麦366 小麦种', emoji: '🌾', price: 180, unit: '25kg/袋', stock: 300, sold: 420, on: true, cat: 'guoyang' },
  { id: 1003, name: '国电·植保无人机(日租)', emoji: '🛸', price: 350, unit: '天', stock: 12, sold: 76, on: true, cat: 'guoyang' },
  { id: 1004, name: '中石化·农机柴油券', emoji: '⛽', price: 500, unit: '张', stock: 200, sold: 340, on: true, cat: 'guoyang' },
  { id: 1005, name: '国企日化·家清礼包', emoji: '🧴', price: 89, unit: '箱', stock: 600, sold: 1200, on: true, cat: 'guoyang' },
  { id: 1006, name: '中储粮·优选大米', emoji: '🍚', price: 68, unit: '10kg', stock: 800, sold: 1500, on: true, cat: 'guoyang' },
];

// 供享优品（村社臻选 · 跨类精选好物 / 礼盒）
const YOUPIN: MyProduct[] = [
  { id: 2001, name: '供享优品·党建联建大礼包', emoji: '🎁', price: 199, unit: '盒', stock: 300, sold: 520, on: true, cat: 'youpin' },
  { id: 2002, name: '供享优品·范庄四季鲜果箱', emoji: '🍎', price: 128, unit: '箱', stock: 400, sold: 680, on: true, cat: 'youpin' },
  { id: 2003, name: '供享优品·助农年货礼盒', emoji: '🧧', price: 288, unit: '盒', stock: 200, sold: 350, on: true, cat: 'youpin' },
  { id: 2004, name: '供享优品·村社臻选杂粮', emoji: '🌾', price: 88, unit: '箱', stock: 500, sold: 900, on: true, cat: 'youpin' },
];

type PanelKey = 'ship' | 'review' | 'data' | 'withdraw';
const QUICK: { icon: string; label: string; key: PanelKey }[] = [
  { icon: '📦', label: '待发货', key: 'ship' },
  { icon: '⭐', label: '评价', key: 'review' },
  { icon: '📈', label: '经营数据', key: 'data' },
  { icon: '💰', label: '提现', key: 'withdraw' },
];
const PANEL_TITLE: Record<PanelKey, string> = { ship: '待发货订单', review: '买家评价', data: '经营数据', withdraw: '收益提现' };

// 店主经营·演示数据（待发货订单、买家评价均接入真实下单 gx_orders；下列仅为经营图表演示数据）
const BIZ_WEEK: [string, number][] = [['一', 820], ['二', 960], ['三', 1180], ['四', 760], ['五', 1420], ['六', 1860], ['日', 1286]];
const DEFAULT_NOTICE = '本店已认证 · 产地直发 · 支持 7 天退换';

export default function MyStorePage() {
  const [opened, setOpened] = useState(true);
  const [products, setProducts] = useState<MyProduct[]>(() => {
    const custom: MyProduct[] = Taro.getStorageSync('gx_shop_custom') || [];
    return [...custom, ...YOUPIN, ...GUOYANG, ...INIT];
  });
  const [cat, setCat] = useState<'all' | 'guoyang' | 'cunli' | 'youpin'>('all');
  const [sort, setSort] = useState<SortKey>('default');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('我');
  const [sel, setSel] = useState<MyProduct | null>(null);
  // 店主/管理可管理商品；普通村民只能浏览下单。切角色后在 useDidShow 刷新。
  const [canManage, setCanManage] = useState(store.canManageShop());
  // 店主经营端：发布商品表单 / 店铺设置 / 四宫格面板
  const [showAdd, setShowAdd] = useState(false);
  const [fName, setFName] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fUnit, setFUnit] = useState('');
  const [fCat, setFCat] = useState<'cunli' | 'youpin' | 'guoyang'>('cunli');
  const [fEmoji, setFEmoji] = useState('🛒');
  const [showSet, setShowSet] = useState(false);
  const [shopName, setShopName] = useState<string>(() => Taro.getStorageSync('gx_shop_name') || '');
  const [notice, setNotice] = useState<string>(() => Taro.getStorageSync('gx_shop_notice') || DEFAULT_NOTICE);
  const [bizOpen, setBizOpen] = useState<boolean>(() => { const raw = Taro.getStorageSync('gx_shop_open'); return raw === '' ? true : !!raw; });
  const [sName, setSName] = useState('');
  const [sNotice, setSNotice] = useState('');
  const [sOpen, setSOpen] = useState(true);
  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [shipOrders, setShipOrders] = useState<Order[]>(() => store.getOrders().filter(o => o.status === '待发货'));
  const [refundOrders, setRefundOrders] = useState<Order[]>(() => store.getOrders().filter(o => o.status === '退款中'));
  // 买家评价：真实取自已点评订单（买家在「我的订单」提交 review 后写回 gx_orders）
  const [reviews, setReviews] = useState<Order[]>(() => store.getOrders().filter(o => o.review));
  const [wBalance, setWBalance] = useState<number>(() => { const s = Taro.getStorageSync('gx_shop_wbal'); return (typeof s === 'number') ? s : 3860.5; });
  const [wDone, setWDone] = useState<number>(() => { const s = Taro.getStorageSync('gx_shop_wdone'); return (typeof s === 'number') ? s : 28600; });

  const managedShop = shopName.trim() || VILLAGE_STORE;
  const canSeeOrder = (o: Order) => store.isPlatformAdmin() || (o.shop || VILLAGE_STORE) === managedShop;
  const refreshOrderPanels = () => {
    const own = store.getOrders().filter(canSeeOrder);
    setShipOrders(own.filter(o => o.status === '待发货'));
    setRefundOrders(own.filter(o => o.status === '退款中'));
    setReviews(own.filter(o => o.review));
  };

  useDidShow(() => { setName(store.getUser()?.name || '我'); setCanManage(store.canManageShop()); refreshOrderPanels(); });

  const toggle = (id: number) => {
    if (!store.canManageShop()) { Taro.showToast({ title: '仅店主可管理商品', icon: 'none' }); return; }
    setProducts(p => p.map(x => x.id === id ? { ...x, on: !x.on } : x));
    Taro.showToast({ title: '商品状态已更新', icon: 'success' });
  };
  const money = (n: number) => n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const openSet = () => { setSName(shopName); setSNotice(notice === DEFAULT_NOTICE ? '' : notice); setSOpen(bizOpen); setShowSet(true); };
  const add = () => { setFName(''); setFPrice(''); setFUnit(''); setFCat('cunli'); setFEmoji('🛒'); setShowAdd(true); };
  const submitAdd = () => {
    const nm = fName.trim();
    const pr = parseFloat(fPrice);
    if (!nm) { Taro.showToast({ title: '请填写商品名称', icon: 'none' }); return; }
    if (!pr || pr <= 0) { Taro.showToast({ title: '请填写正确价格', icon: 'none' }); return; }
    const np: MyProduct = { id: Date.now(), name: nm, emoji: fEmoji, price: pr, unit: fUnit.trim() || '份', stock: 100, sold: 0, on: true, cat: fCat };
    const custom: MyProduct[] = Taro.getStorageSync('gx_shop_custom') || [];
    Taro.setStorageSync('gx_shop_custom', [np, ...custom]);
    setProducts(p => [np, ...p]);
    setShowAdd(false);
    Taro.showToast({ title: '商品已发布上架', icon: 'success' });
  };
  const saveSettings = () => {
    const nm = sName.trim();
    const nt = sNotice.trim() || DEFAULT_NOTICE;
    setShopName(nm); setNotice(nt); setBizOpen(sOpen);
    Taro.setStorageSync('gx_shop_name', nm);
    Taro.setStorageSync('gx_shop_notice', nt);
    Taro.setStorageSync('gx_shop_open', sOpen);
    setShowSet(false);
    Taro.showToast({ title: '店铺设置已保存', icon: 'success' });
  };
  const ship = (id: string) => {
    const order = store.getOrders().find(o => o.id === id);
    if (!order || !canSeeOrder(order)) { Taro.showToast({ title: '无权操作其他店铺订单', icon: 'none' }); return; }
    const d = new Date();
    const p2 = (n: number) => (n < 10 ? '0' + n : '' + n);
    const stamp = `${d.getMonth() + 1}月${d.getDate()}日 ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    if (order.method === '自提') {
      store.updateOrder(id, {
        status: '配送中',
        courier: { name: '到店自提', no: id, tel: '15116900077' },
        logistics: [{ time: stamp, desc: '商品已备好，请到服务站核验取货' }, ...(order.logistics || [])],
      });
      refreshOrderPanels();
      Taro.showToast({ title: '已备货 · 等待到店自提', icon: 'success' });
      return;
    }
    Taro.showActionSheet({
      itemList: ['平台同城配送', '顺丰速运'],
      success: res => {
        const courier = res.tapIndex === 0
          ? { name: '平台同城配送', no: `GX${Date.now().toString().slice(-10)}`, tel: '15116900077' }
          : { name: '顺丰速运', no: `SF${Date.now().toString().slice(-10)}`, tel: '95338' };
        store.updateOrder(id, {
          status: '配送中',
          courier,
          logistics: [{ time: stamp, desc: `商家已发货 · ${courier.name}已揽收` }, ...(order.logistics || [])],
        });
        refreshOrderPanels();
        Taro.showToast({ title: `已交给${courier.name}`, icon: 'success' });
      },
    });
  };
  const approveRefund = (id: string) => {
    const order = store.getOrders().find(o => o.id === id);
    if (!order || order.status !== '退款中' || !canSeeOrder(order)) return;
    Taro.showModal({
      title: '确认退款',
      content: `确认同意订单 ${id} 退款？原抵扣贡献值将退回，待确认的消费贡献值自动冲正。`,
      confirmText: '同意退款',
      success: res => {
        if (!res.confirm) return;
        store.reverseOrderContrib(id);
        if (order.contribUsed) store.restoreContrib(order.contribUsed);
        store.updateOrder(id, {
          status: '已退款',
          contribUsed: 0,
          logistics: [{ time: '刚刚', desc: '商家已同意退款，原支付与抵扣权益按原路退回' }, ...(order.logistics || [])],
        });
        refreshOrderPanels();
        Taro.showToast({ title: '退款已完成 · 权益已冲正', icon: 'success' });
      },
    });
  };
  const withdraw = () => {
    if (wBalance <= 0) { Taro.showToast({ title: '暂无可提现余额', icon: 'none' }); return; }
    Taro.showModal({ title: '申请提现', content: `可提现 ¥${money(wBalance)} 将转入尾号 6688 的银行卡，预计 T+1 到账。确认提现？`, confirmText: '确认提现', success: r => { if (r.confirm) { const nd = wDone + wBalance; setWDone(nd); setWBalance(0); Taro.setStorageSync('gx_shop_wdone', nd); Taro.setStorageSync('gx_shop_wbal', 0); Taro.showToast({ title: '提现申请已提交', icon: 'success' }); } } });
  };
  // 村民购物：加入购物车（go=true 时直达购物车结算）
  const buy = (p: MyProduct, go?: boolean) => {
    if (!store.requireBound()) return;
    store.addToCart({ id: 300000 + p.id, name: p.name, price: p.price, image: PRODUCT_IMG[p.id] || '', qty: 1, spec: p.unit, shop: shopOf(p).name });
    if (go) Taro.reLaunch({ url: '/pages/cart/index' });
    else Taro.showToast({ title: '已加入购物车', icon: 'success' });
  };

  const totalSold = products.reduce((s, p) => s + p.sold, 0);
  const income = products.reduce((s, p) => s + p.sold * p.price, 0);
  const pendingShip = shipOrders.length;
  // 评价汇总（真实数据）：综合评分取商品星均值，好评率=商品星≥4 占比
  const reviewCount = reviews.length;
  const reviewAvg = reviewCount ? reviews.reduce((s, o) => s + (o.review?.star || 0), 0) / reviewCount : 0;
  const reviewGood = reviewCount ? Math.round(reviews.filter(o => (o.review?.star || 0) >= 4).length / reviewCount * 100) : 0;

  if (!opened) {
    return (
      <View className="page">
        <View className="empty-store">
          <Text className="empty-emoji">🏪</Text>
          <Text className="empty-title">开通你的村社小卖部</Text>
          <Text className="empty-desc">把自家的农产品、手工艺品挂上来，足不出村就能卖向全国。村委免费帮你认证、推流。</Text>
          <View className="empty-btn" onClick={() => { setOpened(true); Taro.showToast({ title: '小卖部已开通', icon: 'success' }); }}>
            <Text className="empty-btn-text">一键开通小卖部</Text>
          </View>
        </View>
        <View className="tabbar-placeholder" />
        <TabBar active="my-store" />
      </View>
    );
  }

  return (
    <View className="page">
      {/* 供销社官方门头牌（与首页一致） */}
      <Image style={{ width: '100%', display: 'block' }} src={villageBanner} mode="widthFix" />
      <View className="store-header">
        <View className="store-avatar"><Text style={{ fontSize: '56rpx' }}>{canManage ? '🏪' : '🛒'}</Text></View>
        <View className="store-meta">
          <Text className="store-name">{canManage ? (shopName || `${name}的小卖部`) : '供享大集'}</Text>
          <Text className="store-tag">{canManage ? `${bizOpen ? '🟢 营业中' : '🔴 休息中'} · ${store.getUser()?.orgName || '供销合作社认证'}` : `${SHOP_COUNT} 家小卖部入驻 · 综合商超 · 多店同购`}</Text>
        </View>
        {canManage && (
          <View className="store-set" onClick={openSet}>
            <Text className="store-set-text">店铺设置</Text>
          </View>
        )}
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          {canManage && (
            <View className="kpi-row">
              <View className="kpi"><Text className="kpi-num">{products.filter(p => p.on).length}</Text><Text className="kpi-label">在售商品</Text></View>
              <View className="kpi"><Text className="kpi-num">{totalSold}</Text><Text className="kpi-label">累计销量</Text></View>
              <View className="kpi"><Text className="kpi-num">¥{income.toFixed(0)}</Text><Text className="kpi-label">累计收入</Text></View>
            </View>
          )}

          {canManage && (
            <View
              style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1rpx solid #fdba74', borderRadius: '14rpx', padding: '20rpx 24rpx', marginBottom: '16rpx' }}
              onClick={() => Taro.navigateTo({ url: '/pkgPlatform/interest-community/index' })}
            >
              <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: '26rpx', color: '#9a3412', fontWeight: 700 }}>🤝 你是共同体里的商家</Text>
                <Text style={{ fontSize: '22rpx', color: '#c2410c', fontWeight: 700 }}>看利益共同体 ›</Text>
              </View>
              <Text style={{ display: 'block', fontSize: '22rpx', color: '#c2410c', lineHeight: 1.7, marginTop: '10rpx' }}>平台流量扶持 + 消费返贡献值锁客 + 4:6 分佣 + 集体控股共享收益 + 保底收购托底。卖得好，你、你的客户、集体一起分。</Text>
            </View>
          )}

          {canManage && (
            <View className="notice-bar" onClick={openSet}>
              <Text className="notice-text">📢 {notice}</Text>
              <Text className="notice-edit">编辑 ›</Text>
            </View>
          )}

          {canManage && (
            <View className="quick-grid">
              {QUICK.map(q => {
                const badge = q.key === 'ship' ? pendingShip : 0;
                return (
                  <View key={q.label} className="quick-item" onClick={() => setPanel(q.key)}>
                    <View className="quick-icon-wrap">
                      <Text className="quick-icon">{q.icon}</Text>
                      {badge > 0 && <View className="quick-badge"><Text className="quick-badge-text">{badge}</Text></View>}
                    </View>
                    <Text className="quick-label">{q.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {canManage && (
            <View style={{ background: 'linear-gradient(135deg,#faf5ff,#f3e8ff)', border: '1rpx solid #e9d5ff', borderRadius: '14rpx', padding: '20rpx 24rpx', marginBottom: '16rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => Taro.navigateTo({ url: '/pkgLife/spotlight/index' })}>
              <Text style={{ fontSize: '26rpx', color: '#6b21a8', fontWeight: 700 }}>✨ 聚光星推广</Text>
              <Text style={{ fontSize: '22rpx', color: '#7c3aed' }}>买流量位 · 推自己的好商品 ›</Text>
            </View>
          )}

          {!canManage && (
            <View className="buyer-banner"><Text className="buyer-banner-text">🛒 供享大集 · 附近小卖部好物一站购，下单即助农，每单贡献值 +5</Text></View>
          )}

          <View style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: '100rpx', padding: '14rpx 26rpx', marginBottom: '16rpx', border: '1rpx solid #e5e7eb' }}>
            <Text style={{ fontSize: '28rpx', marginRight: '12rpx' }}>🔍</Text>
            <Input style={{ flex: 1, fontSize: '25rpx' }} placeholder={canManage ? '搜我的商品（名称 / 规格）' : '搜同类商品，如 鸡蛋 / 酒 / 大米 / 芝麻油'} value={search} onInput={e => setSearch(e.detail.value)} />
            {search ? <Text style={{ fontSize: '26rpx', color: '#9ca3af', padding: '0 6rpx' }} onClick={() => setSearch('')}>✕</Text> : null}
          </View>

          {!canManage && (
            <ScrollView scrollX style={{ whiteSpace: 'nowrap', padding: '4rpx 0 16rpx' }}>
              {SORTS.map(([k, l]) => (
                <View key={k} style={{ display: 'inline-block', padding: '10rpx 26rpx', marginRight: '12rpx', borderRadius: '100rpx', background: sort === k ? '#16a34a' : '#fff', border: sort === k ? 'none' : '1rpx solid #e5e7eb' }} onClick={() => setSort(k)}>
                  <Text style={{ fontSize: '23rpx', color: sort === k ? '#fff' : '#4b5563', fontWeight: sort === k ? 700 : 400 }}>{l}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {!canManage && (
            <View style={{ background: '#fff7ed', border: '1rpx solid #fed7aa', borderRadius: '14rpx', padding: '20rpx 24rpx', marginBottom: '16rpx', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => Taro.showModal({ title: '申请开小卖部', content: '在本村开店需经村委会审核同意。\n\n提交后村委会将核验你的身份与经营内容，通过后即可上架商品、对全平台可见。确认提交申请？', confirmText: '提交申请', success: r => { if (r.confirm) Taro.showToast({ title: '已提交，等待村委会审批', icon: 'none' }); } })}>
              <Text style={{ fontSize: '26rpx', color: '#9a3412', fontWeight: 700 }}>📣 我也要开小卖部</Text>
              <Text style={{ fontSize: '22rpx', color: '#ea580c' }}>创业开店 · 村委会审批 ›</Text>
            </View>
          )}

          <View className="sec-head">
            <Text className="sec-title">{canManage ? '我的商品' : '大集好物'}</Text>
            {canManage && <Text className="sec-add" onClick={add}>+ 发布商品</Text>}
          </View>

          <View style={{ display: 'flex', gap: '12rpx', padding: '0 0 16rpx' }}>
            {([['all', '全部'], ['guoyang', '🏭 国央企好物'], ['youpin', '✨ 供享优品'], ['cunli', '🌾 村里好物']] as const).map(([k, l]) => (
              <View key={k} style={{ flex: 1, textAlign: 'center', padding: '14rpx 0', borderRadius: '100rpx', background: cat === k ? '#16a34a' : '#f3f4f6' }} onClick={() => setCat(k)}>
                <Text style={{ fontSize: '23rpx', color: cat === k ? '#fff' : '#6b7280', fontWeight: cat === k ? 700 : 400 }}>{l}</Text>
              </View>
            ))}
          </View>

          {products.filter(p => canManage || p.on).filter(p => cat === 'all' || (p.cat || 'cunli') === cat).filter(p => !search || p.name.includes(search) || (p.unit || '').includes(search)).sort((a, b) => {
            if (canManage) return 0;
            if (sort === 'sold') return b.sold - a.sold;
            if (sort === 'priceAsc') return a.price - b.price;
            if (sort === 'priceDesc') return b.price - a.price;
            if (sort === 'star') return shopOf(b).star - shopOf(a).star || b.sold - a.sold;
            const sa = store.isSpotlight(a.id) ? 1 : 0, sb = store.isSpotlight(b.id) ? 1 : 0;
            return sb - sa; // 综合排序：聚光星商品优先置顶
          }).map(p => (
            <View key={p.id} className={`prod-card ${p.on ? '' : 'prod-off'}`} onClick={() => setSel(p)}>
              <View className="prod-thumb">
                {PRODUCT_IMG[p.id]
                  ? <Image style={{ width: '100%', height: '100%', borderRadius: '14rpx' }} src={PRODUCT_IMG[p.id]} mode="aspectFill" />
                  : <Text style={{ fontSize: '48rpx' }}>{p.emoji}</Text>}
              </View>
              <View className="prod-info">
                <Text className="prod-name">{p.name}</Text>
                {!canManage && <Text style={{ display: 'block', fontSize: '20rpx', color: '#6b7280', marginTop: '4rpx' }}>🏪 {shopOf(p).name} · ⭐{shopOf(p).star.toFixed(1)}</Text>}
                {!canManage && store.isSpotlight(p.id) && <Text style={{ display: 'inline-block', fontSize: '18rpx', color: '#7c3aed', background: '#faf5ff', border: '1rpx solid #e9d5ff', borderRadius: '6rpx', padding: '2rpx 10rpx', marginTop: '4rpx', marginRight: '6rpx' }}>✨ 聚光星</Text>}
                {isPartyMerchant(p.id) && <Text style={{ display: 'inline-block', fontSize: '18rpx', color: '#c81e1e', background: '#fef2f2', border: '1rpx solid #fecaca', borderRadius: '6rpx', padding: '2rpx 10rpx', marginTop: '4rpx' }}>🚩 党员商户</Text>}
                <View className="prod-meta">
                  <Text className="prod-price">¥{p.price}/{p.unit}</Text>
                  <Text className="prod-sub">{canManage ? `库存${p.stock} · 已售${p.sold}` : `已售${p.sold}`}</Text>
                </View>
              </View>
              {canManage ? (
                <View className={`prod-toggle ${p.on ? 'toggle-on' : 'toggle-off'}`} onClick={(e) => { e.stopPropagation(); toggle(p.id); }}>
                  <Text className="prod-toggle-text">{p.on ? '在售' : '已下架'}</Text>
                </View>
              ) : (
                <View className="prod-toggle toggle-on" onClick={(e) => { e.stopPropagation(); buy(p); }}>
                  <Text className="prod-toggle-text">购买</Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>

      {sel && (
        <View style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSel(null)}>
          <View style={{ width: '84%', maxHeight: '86vh', background: '#fff', borderRadius: '24rpx', padding: '28rpx', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <ScrollView scrollY style={{ maxHeight: '80vh' }}>
            <Swiper indicatorDots autoplay circular indicatorActiveColor="#16a34a" style={{ height: '420rpx', borderRadius: '16rpx', overflow: 'hidden' }}>
              <SwiperItem>
                {PRODUCT_IMG[sel.id]
                  ? <Image style={{ width: '100%', height: '420rpx' }} src={PRODUCT_IMG[sel.id]} mode="aspectFill" />
                  : <View style={{ height: '420rpx', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}><Text style={{ fontSize: '160rpx' }}>{sel.emoji}</Text></View>}
              </SwiperItem>
              {(sel.images || []).map((img, i) => (
                <SwiperItem key={i}><Image style={{ width: '100%', height: '420rpx' }} src={img} mode="aspectFill" /></SwiperItem>
              ))}
              <SwiperItem><View style={{ height: '420rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#ecfdf5' }}><Text style={{ fontSize: '80rpx' }}>🌾</Text><Text style={{ fontSize: '24rpx', color: '#15803d', marginTop: '12rpx' }}>产地实拍图（示例位·可换真图）</Text></View></SwiperItem>
              <SwiperItem><View style={{ height: '420rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff7ed' }}><Text style={{ fontSize: '80rpx' }}>🎁</Text><Text style={{ fontSize: '24rpx', color: '#9a3412', marginTop: '12rpx' }}>包装示意图（示例位·可换真图）</Text></View></SwiperItem>
              <SwiperItem><View style={{ height: '420rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#eff6ff' }}><Text style={{ fontSize: '80rpx' }}>📋</Text><Text style={{ fontSize: '24rpx', color: '#1e40af', marginTop: '12rpx' }}>质检报告·合格（示例位·可换真图）</Text></View></SwiperItem>
              <SwiperItem><View style={{ height: '420rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fef2f2' }}><Text style={{ fontSize: '80rpx' }}>🔍</Text><Text style={{ fontSize: '24rpx', color: '#c81e1e', marginTop: '12rpx' }}>细节特写图（示例位·可换真图）</Text></View></SwiperItem>
              <SwiperItem><View style={{ height: '420rpx', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fffbeb' }}><Text style={{ fontSize: '80rpx' }}>🍽️</Text><Text style={{ fontSize: '24rpx', color: '#a16207', marginTop: '12rpx' }}>食用场景图（示例位·可换真图）</Text></View></SwiperItem>
            </Swiper>
            <View style={{ marginTop: '16rpx' }}>
              <Text style={{ fontSize: '24rpx', fontWeight: 700, color: '#c81e1e' }}>📹 产品实拍视频</Text>
              <Video style={{ width: '100%', height: '360rpx', borderRadius: '16rpx', marginTop: '10rpx' }} src={sel.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'} poster={PRODUCT_IMG[sel.id] || ''} controls showCenterPlayBtn objectFit="cover" />
              <Text style={{ display: 'block', fontSize: '19rpx', color: '#9ca3af', marginTop: '4rpx' }}>（示例视频；正式版为该商品的产地实拍 / 直播带货回放）</Text>
            </View>
            <Text style={{ display: 'block', fontSize: '32rpx', fontWeight: 'bold', color: '#1f2937', marginTop: '20rpx' }}>{sel.name}</Text>
            <View style={{ display: 'flex', alignItems: 'baseline', marginTop: '10rpx' }}>
              <Text style={{ fontSize: '46rpx', fontWeight: 'bold', color: '#dc2626' }}>¥{sel.price}</Text>
              <Text style={{ fontSize: '24rpx', color: '#9ca3af', marginLeft: '10rpx' }}>/ {sel.unit}</Text>
            </View>
            <View style={{ display: 'flex', gap: '28rpx', marginTop: '14rpx' }}>
              <Text style={{ fontSize: '24rpx', color: '#6b7280' }}>库存 {sel.stock}</Text>
              <Text style={{ fontSize: '24rpx', color: '#6b7280' }}>已售 {sel.sold}</Text>
              <Text style={{ fontSize: '24rpx', color: sel.on ? '#16a34a' : '#9ca3af' }}>{sel.on ? '在售中' : '已下架'}</Text>
            </View>
            <Text style={{ display: 'block', fontSize: '22rpx', color: '#9a3412', background: '#fff7ed', borderRadius: '10rpx', padding: '12rpx 16rpx', marginTop: '16rpx' }}>{canManage ? `📍 ${name}的小卖部` : `🏪 ${shopOf(sel).name} · ⭐${shopOf(sel).star.toFixed(1)} · ${shopOf(sel).tag}`}</Text>
            {!canManage && store.isSpotlight(sel.id) && (
              <Text style={{ display: 'block', fontSize: '22rpx', color: '#7c3aed', background: '#faf5ff', borderRadius: '10rpx', padding: '12rpx 16rpx', marginTop: '12rpx', lineHeight: 1.6 }}>✨ 聚光星推荐 · 党组织流量扶持 / 商家精选，助农好货优先曝光</Text>
            )}
            {isPartyMerchant(sel.id) && (
              <View style={{ background: '#fef2f2', border: '1rpx solid #fecaca', borderRadius: '14rpx', padding: '18rpx', marginTop: '16rpx' }}>
                <Text style={{ fontSize: '25rpx', fontWeight: 800, color: '#c81e1e', display: 'block' }}>🚩 党员商户</Text>
                <Text style={{ fontSize: '22rpx', color: '#9a3412', display: 'block', marginTop: '8rpx', lineHeight: 1.7 }}>党支部确认 · 亮身份作承诺：诚信经营、明码实价、接受群众监督</Text>
                <Text style={{ fontSize: '22rpx', color: '#9a3412', display: 'block', lineHeight: 1.7 }}>党员待遇：优先推荐位 · 平台手续费减免 · 党建流量扶持</Text>
              </View>
            )}
            <View style={{ background: '#f9fafb', borderRadius: '14rpx', padding: '18rpx', marginTop: '16rpx' }}>
              <Text style={{ fontSize: '25rpx', fontWeight: 700, color: '#14532d', display: 'block', marginBottom: '10rpx' }}>📋 产品介绍</Text>
              <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.75 }}>· 规格：{sel.unit}</Text>
              <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.75 }}>· 产地：{sel.cat === 'guoyang' ? '国央企基地 · 直采直供、国企背书' : '天津东丽华明范庄 · 党支部组织生产'}</Text>
              <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.75 }}>· 卖点：{sel.cat === 'guoyang' ? '正品溯源、质量有保障、省中间环节' : sel.cat === 'youpin' ? '村社臻选、礼盒品质、党建联建优选' : '当季新鲜、党支部书记品控担保、产地直发'}</Text>
              <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.75 }}>· 保障：可溯源 · 支持退换 · 下单助农每单贡献值 +5</Text>
            </View>
            <View style={{ background: '#f0fdf4', borderRadius: '14rpx', padding: '18rpx', marginTop: '16rpx' }}>
              <Text style={{ fontSize: '25rpx', fontWeight: 700, color: '#14532d', display: 'block', marginBottom: '10rpx' }}>🌿 功效与营养</Text>
              <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.8 }}>{efficacyOf(sel)}</Text>
            </View>
            <View style={{ display: 'flex', gap: '16rpx', marginTop: '22rpx' }}>
              {canManage ? (
                <View style={{ flex: 1, textAlign: 'center', padding: '20rpx', borderRadius: '999rpx', background: '#16a34a' }} onClick={() => { toggle(sel.id); setSel({ ...sel, on: !sel.on }); }}><Text style={{ color: '#fff', fontSize: '27rpx', fontWeight: 'bold' }}>{sel.on ? '下架' : '上架'}</Text></View>
              ) : (
                <View style={{ flex: 1, textAlign: 'center', padding: '20rpx', borderRadius: '999rpx', background: '#16a34a' }} onClick={() => buy(sel, true)}><Text style={{ color: '#fff', fontSize: '27rpx', fontWeight: 'bold' }}>立即购买</Text></View>
              )}
              <View style={{ flex: 1, textAlign: 'center', padding: '20rpx', borderRadius: '999rpx', background: canManage ? '#f3f4f6' : '#fff7ed' }} onClick={() => { if (canManage) { setSel(null); } else { buy(sel); } }}><Text style={{ color: canManage ? '#374151' : '#ea580c', fontSize: '27rpx', fontWeight: canManage ? 'normal' : 'bold' }}>{canManage ? '关闭' : '加入购物车'}</Text></View>
            </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* 发布商品表单 */}
      {canManage && showAdd && (
        <View className="modal-mask" onClick={() => setShowAdd(false)}>
          <View className="modal-card" onClick={(e) => e.stopPropagation()}>
            <View className="modal-head">
              <Text className="modal-title">发布新商品</Text>
              <Text className="modal-close" onClick={() => setShowAdd(false)}>✕</Text>
            </View>
            <ScrollView scrollY className="modal-body">
              <View className="form-row">
                <Text className="form-label">商品名称</Text>
                <Input className="form-input" placeholder="如：范庄村现摘水果黄瓜" value={fName} onInput={(e) => setFName(e.detail.value)} />
              </View>
              <View className="form-row">
                <Text className="form-label">价格（元）</Text>
                <Input className="form-input" type="digit" placeholder="如：9.9" value={fPrice} onInput={(e) => setFPrice(e.detail.value)} />
              </View>
              <View className="form-row">
                <Text className="form-label">规格 / 单位</Text>
                <Input className="form-input" placeholder="如：5斤 / 箱 / 礼盒" value={fUnit} onInput={(e) => setFUnit(e.detail.value)} />
              </View>
              <View className="form-row">
                <Text className="form-label">商品分类</Text>
                <View className="form-chips">
                  {([['cunli', '🌾 村里好物'], ['youpin', '✨ 供享优品'], ['guoyang', '🏭 国央企好物']] as const).map(([k, l]) => (
                    <View key={k} className={`form-chip ${fCat === k ? 'form-chip-on' : ''}`} onClick={() => setFCat(k)}>
                      <Text className="form-chip-txt">{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className="form-row">
                <Text className="form-label">商品图标</Text>
                <View className="form-emojis">
                  {['🛒', '🥬', '🍎', '🥚', '🍯', '🍚', '🍖', '🍶', '🧺'].map((em) => (
                    <View key={em} className={`form-emoji ${fEmoji === em ? 'form-emoji-on' : ''}`} onClick={() => setFEmoji(em)}>
                      <Text style={{ fontSize: '40rpx' }}>{em}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className="form-btns">
                <View className="form-btn-ghost" onClick={() => setShowAdd(false)}><Text className="form-btn-ghost-txt">取消</Text></View>
                <View className="form-btn-primary" onClick={submitAdd}><Text className="form-btn-primary-txt">确认发布</Text></View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* 店铺设置 */}
      {canManage && showSet && (
        <View className="modal-mask" onClick={() => setShowSet(false)}>
          <View className="modal-card" onClick={(e) => e.stopPropagation()}>
            <View className="modal-head">
              <Text className="modal-title">店铺设置</Text>
              <Text className="modal-close" onClick={() => setShowSet(false)}>✕</Text>
            </View>
            <ScrollView scrollY className="modal-body">
              <View className="form-row">
                <Text className="form-label">店铺名称</Text>
                <Input className="form-input" placeholder={`${name}的小卖部`} value={sName} onInput={(e) => setSName(e.detail.value)} />
              </View>
              <View className="form-row">
                <Text className="form-label">店铺公告</Text>
                <Input className="form-input" placeholder="一句话介绍你的店，如：产地直发 · 支持退换" value={sNotice} onInput={(e) => setSNotice(e.detail.value)} />
              </View>
              <View className="form-row">
                <Text className="form-label">营业状态</Text>
                <View className="form-chips">
                  <View className={`form-chip ${sOpen ? 'form-chip-on' : ''}`} onClick={() => setSOpen(true)}><Text className="form-chip-txt">🟢 营业中</Text></View>
                  <View className={`form-chip ${!sOpen ? 'form-chip-on' : ''}`} onClick={() => setSOpen(false)}><Text className="form-chip-txt">🔴 休息中</Text></View>
                </View>
              </View>
              <View className="form-btns">
                <View className="form-btn-ghost" onClick={() => setShowSet(false)}><Text className="form-btn-ghost-txt">取消</Text></View>
                <View className="form-btn-primary" onClick={saveSettings}><Text className="form-btn-primary-txt">保存设置</Text></View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* 待发货 / 评价 / 经营数据 / 提现 */}
      {canManage && panel && (
        <View className="modal-mask" onClick={() => setPanel(null)}>
          <View className="modal-card" onClick={(e) => e.stopPropagation()}>
            <View className="modal-head">
              <Text className="modal-title">{PANEL_TITLE[panel]}</Text>
              <Text className="modal-close" onClick={() => setPanel(null)}>✕</Text>
            </View>
            <ScrollView scrollY className="modal-body">
              {panel === 'ship' && (
                <View>
                  <View style={{ background: '#fff7ed', borderRadius: '14rpx', padding: '18rpx', marginBottom: '18rpx' }}>
                    <Text style={{ display: 'block', fontSize: '23rpx', color: '#9a3412', fontWeight: 700 }}>
                      当前经营门店：{store.isPlatformAdmin() ? '平台全局监管' : managedShop}
                    </Text>
                    {!store.isPlatformAdmin() && <Text style={{ display: 'block', fontSize: '20rpx', color: '#b45309', marginTop: '6rpx' }}>只展示本店订单；门店名称可在「店铺设置」中调整。</Text>}
                  </View>
                  {refundOrders.length > 0 && (
                    <View style={{ marginBottom: '22rpx' }}>
                      <Text style={{ display: 'block', fontSize: '26rpx', fontWeight: 800, color: '#dc2626', marginBottom: '12rpx' }}>退款申请（{refundOrders.length}）</Text>
                      {refundOrders.map(o => (
                        <View key={o.id} className="ship-card" style={{ border: '1rpx solid #fecaca' }}>
                          <Text className="ship-buyer">🏪 {o.shop || VILLAGE_STORE}</Text>
                          <Text className="ship-item">{o.items.map(it => `${it.name}×${it.qty}`).join('、')}</Text>
                          <View className="ship-bottom">
                            <Text className="ship-amount">¥{o.total.toFixed(2)}</Text>
                            <View className="ship-btn" style={{ background: '#dc2626' }} onClick={() => approveRefund(o.id)}><Text className="ship-btn-text">审核退款</Text></View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {shipOrders.length === 0 && <Text className="panel-empty">暂无待发货订单</Text>}
                  {shipOrders.map((o) => (
                    <View key={o.id} className="ship-card">
                      <View className="ship-top">
                        <Text className="ship-buyer">🏪 {o.shop || VILLAGE_STORE}</Text>
                        <Text className="ship-id">{o.id}</Text>
                      </View>
                      <Text className="ship-item">{o.items.map(it => `${it.name}×${it.qty}`).join('、')}</Text>
                      <Text className="ship-addr">📍 {o.address}</Text>
                      <View className="ship-bottom">
                        <Text className="ship-amount">¥{o.total.toFixed(2)}</Text>
                        <View className="ship-btn" onClick={() => ship(o.id)}><Text className="ship-btn-text">确认发货</Text></View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {panel === 'review' && (
                <View>
                  {reviewCount === 0 ? (
                    <Text className="panel-empty">还没有买家评价，等买家确认收货并点评后就会显示在这里～</Text>
                  ) : (
                    <View>
                      <View className="rv-summary">
                        <Text className="rv-summary-num">{reviewAvg.toFixed(1)}</Text>
                        <Text className="rv-summary-label">综合评分 · 好评率 {reviewGood}% · 共 {reviewCount} 条</Text>
                      </View>
                      {reviews.map((o) => {
                        const rv = o.review;
                        if (!rv) return null;
                        return (
                          <View key={o.id} className="rv-card">
                            <View className="rv-top">
                              <Text className="rv-buyer">🏪 {o.shop || VILLAGE_STORE}</Text>
                              <Text className="rv-date">商家 ⭐{rv.shopStar}</Text>
                            </View>
                            <Text className="rv-stars">{'★★★★★'.slice(0, rv.star)}{'☆☆☆☆☆'.slice(0, 5 - rv.star)}</Text>
                            <Text className="rv-text">{rv.text || '好评'}</Text>
                            <Text className="rv-item">📦 {o.items.map(it => it.name).join('、')}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
              {panel === 'data' && (
                <View>
                  <View className="data-grid">
                    <View className="data-tile"><Text className="data-num">¥1,286</Text><Text className="data-label">今日 GMV</Text></View>
                    <View className="data-tile"><Text className="data-num">18</Text><Text className="data-label">今日订单</Text></View>
                    <View className="data-tile"><Text className="data-num">326</Text><Text className="data-label">今日访客</Text></View>
                    <View className="data-tile"><Text className="data-num">5.5%</Text><Text className="data-label">下单转化率</Text></View>
                  </View>
                  <Text className="data-sec">近 7 日成交额（元）</Text>
                  <View className="data-bars">
                    {BIZ_WEEK.map(([d, v]) => (
                      <View key={d} className="data-bar-wrap">
                        <Text className="data-bar-val">{v}</Text>
                        <View className="data-bar" style={{ height: (v / 1860 * 160 + 10) + 'rpx' }} />
                        <Text className="data-bar-day">{d}</Text>
                      </View>
                    ))}
                  </View>
                  <View className="data-foot">
                    <Text className="data-foot-row">本月累计 GMV：¥28,600</Text>
                    <Text className="data-foot-row">客单价：¥71 · 复购率：32%</Text>
                    <Text className="data-foot-row">在售商品 {products.filter((p) => p.on).length} 件 · 累计销量 {totalSold} 件</Text>
                  </View>
                </View>
              )}
              {panel === 'withdraw' && (
                <View>
                  <View className="wd-hero">
                    <Text className="wd-hero-label">可提现余额（元）</Text>
                    <Text className="wd-hero-num">{money(wBalance)}</Text>
                  </View>
                  <View className="wd-row">
                    <View className="wd-col"><Text className="wd-col-num">¥1,240.00</Text><Text className="wd-col-label">待结算</Text></View>
                    <View className="wd-col"><Text className="wd-col-num">¥{money(wDone)}</Text><Text className="wd-col-label">累计已提现</Text></View>
                  </View>
                  <View className="wd-btn" onClick={withdraw}><Text className="wd-btn-text">申请提现</Text></View>
                  <Text className="wd-tip">提现将转入已绑定银行卡（尾号 6688）· 预计 T+1 到账</Text>
                  <Text className="wd-tip">村社惠农 · 单笔手续费 0 元（平台免佣）</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      <TabBar active="my-store" />
    </View>
  );
}
