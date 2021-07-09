/*
汪汪乐园
活动地址: 极速版 汪汪乐园
活动时间：长期
更新时间：2021-07-4 12:00
脚本兼容: QuantumultX, Surge,Loon, JSBox, Node.js
=================================Quantumultx=========================
[task_local]
#汪汪乐园
20 * * * *  https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js, tag=汪汪乐园, img-url=https://raw.githubusercontent.com/Orz-3/mini/master/Color/jd.png, enabled=true
=================================Loon===================================
[Script]
cron "20 * * * *" script-path=https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js,tag=汪汪乐园
===================================Surge================================
汪汪乐园 = type=cron,cronexp="20 * * * *",wake-system=1,timeout=3600,script-path=https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js
====================================小火箭=============================
汪汪乐园 = type=cron,script-path=https://raw.githubusercontent.com/jiulan/platypus/main/scripts/jd_joy_park.js, cronexpr="20 * * * *", timeout=3600, enable=true
 */
const $ = new Env('汪汪乐园');
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const notify = $.isNode() ? require('./sendNotify') : '';
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [],
    cookie = '';
const JD_API_HOST = `https://api.m.jd.com`;
codeList = []

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

//最大化硬币收益模式
$.JOY_COIN_MAXIMIZE = process.env.JOY_COIN_MAXIMIZE === '1'
$.log(`最大化收益模式: 已${$.JOY_COIN_MAXIMIZE ? `默认已开启` : `关闭`}  `)

message = ""
!(async () => {
    $.user_agent = require('./USER_AGENTS').USER_AGENT
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', {
            "open-url": "https://bean.m.jd.com/"
        });
        return;
    }
    $.linkid = "LsQNxL7iWDlXUs6cFl-AAg"
    for (let i = 0; i < cookiesArr.length; i++) {
        //$.wait(50)
        if (process.env.JOYPARK_JOY_START && i == process.env.JOYPARK_JOY_START){
            console.log(`\n汪汪乐园养joy 只运行 ${process.env.JOYPARK_JOY_START} 个Cookie\n`);
            break
        }

        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            $.maxJoyCount = 10
            console.log(`\n\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);

            await getinfo()
            await geTasklist()
            if ($.taskList) {
                for (task of $.taskList) {
                    console.log(`去做任务：${task.taskTitle}  id：${task.id}  剩余次数：${task.taskLimitTimes - task.taskDoTimes}`)
                    if (task.id == 166) {
                        await dotask(task.taskType, task.id)
                    } else {
                        let itemid = await apTaskDetail(task.taskType, task.id)
                        for(g=0;g<task.taskLimitTimes - task.taskDoTimes;g++){
                            await dotask(task.taskType, task.id, itemid)
                        }
                    }
                }
                await geTasklist()
                for (task of $.rewardList) {
                    console.log(`去领奖励：${task.taskTitle}  id：${task.id}  剩余次数：${task.canDrawAwardNum}`)
                    for(k=0;k<task.canDrawAwardNum;k++){
                        await getReward(task.taskType, task.id)
                    }
                }
                if(codeList[0]){
                    console.log(`为 ${codeList[0]}助力中`)
                    await getinfo(1,167,codeList[0])
                }

            }
            //下地后还有有钱买Joy并且买了Joy
            $.hasJoyCoin = true
            await getJoyBaseInfo();
            $.activityJoyList = []
            $.workJoyInfoList = []
            await getJoyList(true);
            await getGameShopList()
            //清理工位
            await doJoyMoveDownAll($.workJoyInfoList)
            //从低合到高
            await doJoyMergeAll($.activityJoyList)
            await getJoyList(true)
        }
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())


function getJoyBaseInfo(taskId = '',inviteType = '',inviterPin = '') {
    //await $.wait(20)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"taskId":"${taskId}","inviteType":"${inviteType}","inviterPin":"${inviterPin}","linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&_t=1625480372020&appid=activities_platform`,`joyBaseInfo`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    $.log(`等级: ${data.data.level}|金币: ${data.data.joyCoin}`)
                    $.joyBaseInfo = data.data
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve($.joyBaseInfo);
            }
        })
    })
}

function getJoyList(printLog = false){
    //await $.wait(20)
    return new Promise(resolve => {
        $.get(taskGetClientActionUrl(`appid=activities_platform&body={"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}`,`joyList`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    if (printLog) {
                        $.log(`\n===== 【京东账号${$.index}】${$.nickName || $.UserName} joy 状态 start =====`)
                        $.log("在逛街的joy⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️")
                        for (let i = 0; i < data.data.activityJoyList.length; i++) {
                            //$.wait(50);
                            $.log(`id:${data.data.activityJoyList[i].id}|name: ${data.data.activityJoyList[i].name}|level: ${data.data.activityJoyList[i].level}`);
                        }
                        $.log("\n在铲土的joy⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️")
                        for (let i = 0; i < data.data.workJoyInfoList.length; i++) {
                            //$.wait(50)
                            $.log(`工位: ${data.data.workJoyInfoList[i].location} [${data.data.workJoyInfoList[i].unlock ? `已开` : `未开`}]|joy= ${data.data.workJoyInfoList[i].joyDTO ? `id:${data.data.workJoyInfoList[i].joyDTO.id}|name: ${data.data.workJoyInfoList[i].joyDTO.name}|level: ${data.data.workJoyInfoList[i].joyDTO.level}` : `毛都没有`}`)
                        }
                        $.log(`===== 【京东账号${$.index}】${$.nickName || $.UserName} joy 状态  end  =====\n`)
                    }
                    $.activityJoyList = data.data.activityJoyList
                    $.workJoyInfoList = data.data.workJoyInfoList
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data.data);
            }
        })
    })
}

function getGameShopList(){
    //await $.wait(20)
    return new Promise(resolve => {
        $.get(taskGetClientActionUrl(`appid=activities_platform&body={"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}`,`gameShopList`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    //排除不能购买的
                    data = JSON.parse(data).data.filter(row => row.shopStatus === 1);
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

async function doJoyMoveUpAll(activityJoyList, workJoyInfoList) {
    let workJoyInfoUnlockList = workJoyInfoList.filter(row => row.unlock && row.joyDTO === null)
    if (activityJoyList.length !== 0 && workJoyInfoUnlockList.length !== 0) {
        let maxLevelJoy = Math.max.apply(Math, activityJoyList.map(function (o) {
            return o.level
        }))
        let maxLevelJoyList = activityJoyList.filter(row => row.level === maxLevelJoy)
        $.log(`下地干活！ joyId= ${maxLevelJoyList[0].id} location= ${workJoyInfoUnlockList[0].location}`)
        await doJoyMove(maxLevelJoyList[0].id, workJoyInfoUnlockList[0].location)
        await getJoyList()
        await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
    }else if ($.JOY_COIN_MAXIMIZE) {
        await joyCoinMaximize(workJoyInfoUnlockList)
    }

}

async function joyCoinMaximize(workJoyInfoUnlockList) {
    if (workJoyInfoUnlockList.length !== 0 && $.hasJoyCoin) {
        $.log(`竟然还有工位挖土？开启瞎买瞎下地模式！`);
        let joyBaseInfo = await getJoyBaseInfo()
        let joyCoin = joyBaseInfo.joyCoin
        $.log(`还有${joyCoin}金币,看看还能买啥下地`)
        let shopList = await getGameShopList()
        let newBuyCount = false;
        for (let i = shopList.length - 1;i >= 0;i--){
            if (joyCoin > shopList[i].consume) {
                $.log(`买一只 ${shopList[i].userLevel}级的！`);
                joyCoin = joyCoin - shopList[i].consume;
                let buyResp = await doJoyBuy(shopList[i].userLevel);
                if (!buyResp.success) {
                    break;
                } else {
                    newBuyCount = true
                    $.hasJoyCoin = false
                    i++
                }
            }
        }
        $.hasJoyCoin = false
        if (newBuyCount) {
            await getJoyList()
            await doJoyMoveUpAll($.activityJoyList,$.workJoyInfoList)
            await getJoyBaseInfo();
        }
    }
}

async function doJoyMoveDownAll(workJoyInfoList) {
    if (workJoyInfoList.filter(row => row.joyDTO).length === 0) {
        $.log(`工位清理完成！`)
        return true
    }
    for (let i = 0; i < workJoyInfoList.length; i++) {
        //$.wait(50)
        if (workJoyInfoList[i].unlock && workJoyInfoList[i].joyDTO) {
            $.log(`从工位移除 => id:${workJoyInfoList[i].joyDTO.id}|name: ${workJoyInfoList[i].joyDTO.name}|level: ${workJoyInfoList[i].joyDTO.level}`)
            await doJoyMove(workJoyInfoList[i].joyDTO.id, 0)
        }
    }
    //check
    await getJoyList()
    await doJoyMoveDownAll($.workJoyInfoList)
}

async function doJoyMergeAll(activityJoyList) {
    let minLevel = Math.min.apply(Math, activityJoyList.map(function (o) {
        return o.level
    }))
    let joyMinLevelArr = activityJoyList.filter(row => row.level === minLevel);
    let joyBaseInfo = await getJoyBaseInfo()
    let fastBuyLevel = joyBaseInfo.fastBuyLevel
    if (joyMinLevelArr.length >= 2) {
        $.log(`开始合成 ${minLevel} ${joyMinLevelArr[0].id} <=> ${joyMinLevelArr[1].id} 【限流严重，2秒后合成！如失败会重试】`);
        await $.wait(2000)
        await doJoyMerge(joyMinLevelArr[0].id, joyMinLevelArr[1].id);
        await getJoyList()
        await doJoyMergeAll($.activityJoyList)
    } else if (joyMinLevelArr.length === 1 && joyMinLevelArr[0].level < fastBuyLevel) {
        let buyResp = await doJoyBuy(joyMinLevelArr[0].level);
        if (buyResp.success) {
            await getJoyList();
            await doJoyMergeAll($.activityJoyList);
        } else {
            $.log("没钱了上位吧！")
            await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
        }
    } else {
        $.log(`没有需要合成的joy 开始买买买🛒🛒🛒🛒🛒🛒🛒🛒`)
        $.log(`现在最高可以购买: ${fastBuyLevel}  购买 ${fastBuyLevel} 的joy   你还有${joyBaseInfo.joyCoin}金币`)
        let buyResp = await doJoyBuy(fastBuyLevel);
        if (buyResp.success) {
            await getJoyList();
            await doJoyMergeAll($.activityJoyList);
        } else {
            $.log("没钱了上位吧！")
            await doJoyMoveUpAll($.activityJoyList, $.workJoyInfoList)
        }
    }
}

function doJoyMove(joyId,location){
    //await $.wait(20)
    return new Promise(resolve => {
        $.post(taskGetClientActionUrl(`body={"joyId":${joyId},"location":${location},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`,`joyMove`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (location !== 0) {
                        $.log(`下地完成了！`);
                    }
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data.data);
            }
        })
    })
}

function doJoyMerge(joyId1,joyId2){
    //await $.wait(20)
    return new Promise(resolve => {
        $.get(taskGetClientActionUrl(`body={"joyOneId":${joyId1},"joyTwoId":${joyId2},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`,`joyMergeGet`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                    data = {}
                } else {
                    data = JSON.parse(data);$.log(`合成 ${joyId1} <=> ${joyId2} ${data.success ? `成功！` : `失败！【${data.errMsg}】 code=${data.code}`}`)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data.data);
            }
        })
    })
}

function doJoyBuy(level){
    //await $.wait(20)
    return new Promise(resolve => {
        $.post(taskPostClientActionUrl(`body={"level":${level},"linkId":"LsQNxL7iWDlXUs6cFl-AAg"}&appid=activities_platform`,`joyBuy`), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    data = JSON.parse(data);
                    $.log(`购买joy level: ${level} ${data.success ? `成功！` : `失败！${data.errMsg} code=${data.code}`}`)
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function taskPostClientActionUrl(body,functionId) {
    return {
        url: `https://api.m.jd.com/client.action?${functionId?`functionId=${functionId}`:``}`,
        body: body,
        headers: {
            'User-Agent': $.user_agent,
            'Content-Type':'application/x-www-form-urlencoded',
            'Host':'api.m.jd.com',
            'Origin':'https://joypark.jd.com',
            'Referer':'https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&lng=113.387899&lat=22.512678&sid=4d76080a9da10fbb31f5cd43396ed6cw&un_area=19_1657_52093_0',
            'Cookie': cookie,
        }
    }
}

function taskGetClientActionUrl(body,functionId) {
    return {
        url: `https://api.m.jd.com/client.action?functionId=${functionId}${body ? `&${body}` : ``}`,
        // body: body,
        headers: {
            'User-Agent': $.user_agent,
            'Content-Type':'application/x-www-form-urlencoded',
            'Host':'api.m.jd.com',
            'Origin':'https://joypark.jd.com',
            'Referer':'https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&lng=113.388006&lat=22.512549&sid=4d76080a9da10fbb31f5cd43396ed6cw&un_area=19_1657_52093_0',
            'Cookie': cookie,
        }
    }
}



function geTasklist() {
    return new Promise(async (resolve) => {
        let options = taskPostUrl("apTaskList", `{"linkId":"${$.linkid }"}`)
        //  console.log(options)
        $.post(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    //     console.log(data)
                    data = JSON.parse(data);
                    if (data.success) {
                        $.taskList = data.data.filter(x => !x.taskFinished && x.id != 167)
                        $.rewardList = data.data.filter(x =>x.canDrawAwardNum && x.canDrawAwardNum != 0)
                        console.log(`剩余${$.taskList.length}个任务待完成`)
                        console.log(`剩余${$.rewardList.length}个任务奖励待领取`)
                    } else {
                        console.log(JSON.stringify(data))
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}


function apTaskDetail(type, id) {
    return new Promise(async (resolve) => {
        let options = taskPostUrl("apTaskDetail", `{"taskType":"${type}","taskId":${id},"channel":4,"linkId":"${$.linkid}"}`)
        //   if(id!=166) options = taskPostUrl(`{"taskType":"${type}","taskId":${id},"channel":4,"linkId":"${$.linkid}","itemId":"${itemid}"}`)
        //  console.log(options)
        $.post(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    //     console.log(data)
                    data = JSON.parse(data);
                    if (data.success && data.data) {
                        let itemId = data.data.taskItemList[0].itemId
                        resolve(itemId)
                    } else {
                        console.log(JSON.stringify(data))
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function dotask(type, id, itemid) {
    return new Promise(async (resolve) => {
        let options = taskPostUrl("apDoTask", `{"taskType":"${type}","taskId":${id},"linkId":"${$.linkid}"}`)
        if (id != 166) options = taskPostUrl("apDoTask", `{"taskType":"${type}","taskId":${id},"channel":4,"linkId":"${$.linkid}","itemId":"${itemid}"}`)
        $.post(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    //     console.log(data)
                    data = JSON.parse(data);
                    if (data.success && data.data) {
                        console.log(`    操作结果：${data.data.finished}`)
                    } else {
                        console.log(JSON.stringify(data))
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function getReward(type, id) {
    return new Promise(async (resolve) => {
        let options = taskPostUrl("apTaskDrawAward", `{"taskType":"${type}","taskId":${id},"linkId":"${$.linkid}"}`)
        $.post(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    data = JSON.parse(data);
                    if (data.success && data.data) {
                        console.log(`    领奖结果：获得${data.data[0].awardGivenNumber} ${data.data[0].awardName}`)
                        // if(data.data.finished){await getReward()}
                    } else {
                        console.log(JSON.stringify(data))
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}

function getinfo(inviteType="2",id="",invitePin) {
    return new Promise(async (resolve) => {
        let options = taskPostUrl("joyBaseInfo", `{"taskId":"${id}","inviteType":"${inviteType}","inviterPin":"${invitePin?invitePin:$.invitePin}","linkId":"${$.linkid}"}`)
        $.post(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    data = JSON.parse(data);
                    if (data.success) {
                        let info = data.data
                        if(inviteType ==2){
                            let joyinfo = `等级：Lv${info.level}\n金币：${info.joyCoin} \n离线收益：${info.leaveJoyCoin}\n邀请码：${info.invitePin}`
                            console.log(joyinfo)
                            console.log(`账号${$.index} 助力码 ${info.invitePin}`)
                        }
                        if($.index ==1){
                            $.invitePin = info.invitePin
                        }
                        codeList[codeList.length]  =   info.invitePin
                        if(inviteType ==1) {
                            console.log(`助力结果：${info.helpState}`)
                            resolve(info.helpState)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}


function getJoyInfo() {
    return new Promise(async (resolve) => {
        let options = taskUrl("joyList", `{"linkId":"${$.linkid}"}`)
        //{"taskId":"","inviteType":"","inviterPin":"","linkId":"${$.linkid}"}`)
        //    console.log(options.url)
        $.get(options, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`);
                    console.log(`${$.name} API请求失败，请检查网路重试`);
                } else {
                    data = JSON.parse(data);
                    //   console.log(data)
                    if (data.success) {
                        console.log(`活动中joy ${data.data.activityJoyList.length}`)
                        let wjoy = data.data.workJoyInfoList
                        /*   console.log(`|   Lv6   |   Lv4   |   Lv4   |
   |   Lv4   |   Lv4   |   Lv4   |
   `)*/
                        //   let joyinfo = `等级：Lv${info.level}\n金币：${info.joyCoin} ${info.guideStep}/s\n邀请码：${info.invitePin}`
                        //  console.log(joyinfo)
                    }

                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve();
            }
        });
    });
}





function taskUrl(function_id, body) {
    return {
        url: `${JD_API_HOST}/?functionId=${function_id}&body=${encodeURIComponent(body)}&_t=${Date.now()}&appid=activities_platform`,
        headers: {
            "Host": "api.m.jd.com",
            "Referer": "https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&sid=4e81f8a1ce23cf73f23d04a0fb77d31w&un_area=27_2442_2444_31912",
            "Cookie": cookie,
            "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        }
    }
}


function taskPostUrl(function_id, body) {
    return {
        url: JD_API_HOST,
        body: `functionId=${function_id}&body=${encodeURIComponent(body)}&_t=${Date.now()}&appid=activities_platform`,
        headers: {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-cn",
            "Connection": "keep-alive",
            "Content-Type": "application/x-www-form-urlencoded",
            "Host": "api.m.jd.com",
            "Referer": "https://joypark.jd.com/?activityId=LsQNxL7iWDlXUs6cFl-AAg&sid=4e81f8a1ce23cf73f23d04a0fb77d31w&un_area=27_2442_2444_31912",
            "Cookie": cookie,
            "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        }
    }
}
function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}
// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
