// 贡献值云函数：云端账户 + 流水 + 全村排名
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const col = db.collection('contributions');
  const action = event.action;

  // 获取我的贡献账户 + 全村排名
  if (action === 'get') {
    const res = await col.where({ _openid: OPENID }).get();
    let acct;
    if (res.data.length === 0) {
      acct = { total: 0, month: 0, records: [], updatedAt: db.serverDate() };
      const add = await col.add({ data: acct });
      acct._id = add._id;
    } else {
      acct = res.data[0];
    }
    // 排名：贡献值比我高的人数 + 1
    const higher = await col.where({ total: _.gt(acct.total || 0) }).count();
    return { account: acct, rank: higher.total + 1 };
  }

  // 记一笔贡献（账户累加 + 写流水）
  if (action === 'add') {
    const value = Number(event.value) || 0;
    const rec = {
      title: event.title || '贡献',
      value: value,
      dim: event.dim || '',
      date: new Date().toISOString().slice(0, 10),
      onChain: true,
    };
    const res = await col.where({ _openid: OPENID }).get();
    if (res.data.length === 0) {
      const add = await col.add({
        data: { total: value, month: value, records: [rec], updatedAt: db.serverDate() },
      });
      return { ok: true, total: value, _id: add._id };
    }
    const doc = res.data[0];
    await col.doc(doc._id).update({
      data: {
        total: _.inc(value),
        month: _.inc(value),
        records: _.push([rec]),
        updatedAt: db.serverDate(),
      },
    });
    return { ok: true, total: (doc.total || 0) + value };
  }

  return { error: 'unknown_action' };
};
