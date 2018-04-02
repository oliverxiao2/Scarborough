/*!
 * Ext JS Library
 * Copyright(c) 2006-2014 Sencha Inc.
 * licensing@sencha.com
 * http://www.sencha.com/license
 */
Ext.define('Desktop.TaskQueue', {
    run: function (queue, callback) {
        const promisify = function (callback, param, index) {
            //return function () {
                return new Promise((resolve) => {
                    callback(resolve, param, index)
                })
            //}
        }
    
        const tasks = [];
    
        const n = queue.length;
    
        for (let i = 0; i < n; i++) {
            const item = queue[i];
            tasks.push(promisify(callback, item, i))
        }

    
        tasks.reduce((previousValue, currentValue, index)=>{
            return previousValue.then(currentValue);
        }, Promise.resolve())
    }
});

Ext.define('Desktop.GridWindow', {
    extend: 'Ext.ux.desktop.Module',

    requires: [
        'Ext.data.ArrayStore',
        'Ext.util.Format',
        'Ext.grid.Panel',
        'Ext.grid.RowNumberer'
    ],

    id:'grid-win',

    init : function(){
        this.launcher = {
            text: 'Grid Window',
            iconCls:'icon-grid'
        };
    },

    createWindow : function(){
        var desktop = this.app.getDesktop();
        var win = desktop.getWindow('grid-win');
        if(!win){
            win = desktop.createWindow({
                id: 'grid-win',
                title:'测量文件 数据中心',
                requires: ['Ext.Progress'],
                width:1200,
                height:680,
                iconCls: 'icon-grid',
                animCollapse:false,
                //constrainHeader:true,
                layout: 'border',
                split: false,
                items: [{
                    xtype: 'panel',
                    region: 'west',
                    layout: 'border',
                    width: 600,
                    collaspsible: true,
                    split: { size:2 },
                    items: [{
                        xtype: 'grid',
                        id: 'grid-window-data-source',
                        height: 300,
                        split: { size: 2 },
                        region: 'north',                        
                        store: new Ext.data.ArrayStore({
                            fields: [
                               { name: 'filename' },
                               { name: 'size', type: 'float' },
                               { name: 'lastModifiedTime'},
                               { name: 'status'},
                            ],
                            data: [] //Desktop.GridWindow.getDummyData()
                        }),
                        selType: 'checkboxmodel',
                        columns: [
                            //new Ext.grid.RowNumberer(),
                            {
                                text: "文件名",
                                flex: 1,
                                sortable: true,
                                dataIndex: 'filename'
                            },
                            {
                                text: "大小",
                                width: 120,
                                sortable: true,
                                renderer: Ext.util.Format.fileSize,
                                dataIndex: 'size'
                            },
                            {
                                text: "上次修改时间",
                                width: 200,
                                sortable: true,
                                dataIndex: 'lastModifiedTime',
                                renderer: function (date) { return Ext.util.Format.date(date, 'Y-m-d H:i:s')}
                            },
                            {
                                text: "状态",
                                xtype: 'widgetcolumn',
                                widget: {xtype: 'progress'},
                                width: 70,
                                dataIndex: 'status'
                            }
                        ],
                        listeners: {
                            selectionchange: function (grid, selected) { // don't use itemclick; event "selectionchange" is easier to use arrow up and down to change
                                const item = selected[0];
                                const channels = item && item.data && item.data.channels;
                                const channelList = Ext.getCmp('grid-window-data-source-channels');

                                if (channelList && channels) {
                                    channelList.store.loadData(channels)
                                }
                            }
                        }
                    },{
                        xtype: 'grid',
                        id: 'grid-window-data-source-channels',
                        region: 'west',
                        split: { size: 2},
                        width: 200,
                        columns: [
                            { text: '通道名称', dataIndex: 'signalname'},
                            { text: '描述', dataIndex: 'signalDescription', flex: 1}
                        ],
                        store: new Ext.data.ArrayStore({
                            fields: [
                                { name: 'signalname'},
                                { name: 'description'}
                            ],
                            data: []
                        }),
                        listeners: {
                            selectionchange: function (grid, selected) {
                                const item = selected[0];

                                // when selected some row and change the data source, item will be Null
                                if (!item) return;

                                const worker = new Worker('./app/worker/mdfReadSignals.js');
                                const file = Ext.getCmp('grid-window-data-source').getSelection()[0].data.file;
                                const ch = item.data.signalname;

                                worker.postMessage({
                                    file: file,
                                    channels: [ch]
                                });
                                worker.onmessage = function (e) {
                                    console.log(e.data)
                                    const option = {
                                        title: { show: false},
                                        legend: { show: false},
                                        tooltip: { show: false},
                                        toolbox: { show: false},
                                        grid: {
                                            left: 56,
                                            right: 16,
                                            bottom: 23,
                                            top: 10,
                                        },

                                        xAxis: {
                                            type: 'category',
                                            //data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                                        },
                                        yAxis: {
                                            type: 'value'
                                        },
                                        series: [{
                                            data: e.data[0].map((val, idx) => [idx, val]),
                                            type: 'line'
                                        }]
                                    };

                                    Ext.echartChannelPreview.setOption(option);
                                    
                                    // plot the data in the preview subwindow

                                }
                            }
                        }
                    },{
                        xtype: 'panel',
                        region: 'center',
                        flex: 1,
                        split: true,
                        html: '<iframe id="iframe-channel-preview" style="width:100%; height:100%; border:none;"></iframe>',
                        listeners: {
                            render: function () {
                                const iframe = document.getElementById('iframe-channel-preview');
                                const body = iframe.contentDocument.body;
                                body.style.overflow = 'hidden'; // !important
                                body.style.margin = 0;
                                body.style.padding = 0;
                                
                                const divEl = iframe.contentDocument.createElement('div');
                                divEl.style.width = divEl.style.height = '100%';
                                body.appendChild(divEl);
                                Ext.echartChannelPreviewDivEl = divEl;

                                Ext.echartChannelPreview = echarts.init(divEl);
                                iframe.contentWindow.onresize = Ext.echartChannelPreview.resize;
                            }
                        }
                    },{
                        xtype: 'panel',
                        hidden: true,
                        html: '<input type="file" id="fileinput1" multiple />',
                        listeners: {
                            render: function () {
                                document.getElementById('fileinput1').addEventListener('change', function (e) {
                                    const tq = Ext.create('Desktop.TaskQueue');
                                    const files = Array.from(e.target.files);

                                    function read(file) {
                                        return new Promise((resolve, reject) => {
                                            const worker = new Worker('./app/worker/mdfreader.js');
                                            worker.postMessage(file);
                                            worker.onmessage = function (e) {
                                                const grid = Ext.getCmp('grid-window-data-source');
                                                if (grid) {
                                                    const store = grid.store;
                                                    store.add({
                                                        file: file,
                                                        filename: file.name,
                                                        size: file.size,
                                                        lastModifiedTime: new Date(file.lastModified),
                                                        status: 1,
                                                        channels: e.data,
                                                    });                                                   
                                                }
                                                resolve('receive message')
                                            }
                                        })
                                    }

                                    async function readFiles (files) {
                                        for (const file of files) {
                                            await read(file)
                                        }
                                    }
                                    
                                    readFiles(files);

                                    /*
                                    tq.run(files, function (a, file, index) {
                                        const worker = new Worker('./app/worker/mdfreader.js');
                                        worker.postMessage(file);
                                        worker.onmessage = function (e) {
                                            //console.log(file);
                                            console.log(e);

                                            const grid = Ext.getCmp('grid-window-data-source');
                                            if (grid) {
                                                const store = grid.store;
                                                store.add({
                                                    file: file,
                                                    filename: file.name,
                                                    size: file.size,
                                                    lastModifiedTime: new Date(file.lastModified),
                                                    status: 1,
                                                    channels: e.data,
                                                });
                                                
                                            }
                                        }
                                        // const reader = new FileReader;
                                        // reader.onload = function (e) {
                                        //     console.log(e, e.target.result)
                                        // }
                                        // reader.readAsArrayBuffer(file);
                                    })
                                    */
                                })

                                
                            }
                        }
                    }]
                    },
                    {
                        xtype: 'tabpanel',
                        region: 'center',
                        layout: 'fit',
                        flex: 1,
                        split: true,
                        items: [
                            {
                                xtype: 'panel',
                                title: 'CCF统计辅助',
                                scrollable: true,
                                items: [{
                                    xtype: 'grid',
                                    id: 'grid-window-ccf-params',
                                    columns: [{
                                        text: '名称',
                                        dataIndex: 'name',
                                        width: 120
                                    },{
                                        text: '变量名',
                                        dataIndex: 'variableName',
                                        flex: 1,
                                        editor: {
                                            xtype: 'textfield'
                                        }
                                    },{
                                        text: '最大值',
                                        dataIndex: 'max',
                                        width: 100,
                                        editor: {
                                            xtype: 'numberfield'
                                        }
                                    },{
                                        text: '最小值',
                                        dataIndex: 'min',
                                        width: 100,
                                        editor: {
                                            xtype: 'numberfield'
                                        }
                                    },{
                                        text: '步长',
                                        dataIndex: 'step',
                                        width: 100,
                                        editor: {
                                            xtype: 'numberfield'
                                        }
                                    }],
                                    plugins: [
                                        Ext.create('Ext.grid.plugin.CellEditing', {
                                            clicksToEdit: 1
                                        })
                                    ],
                                    store: new Ext.data.ArrayStore({
                                        fields: [
                                        { name: 'name' },
                                        { name: 'variableName'},
                                        { name: 'max'},
                                        { name: 'min'},
                                        { name: 'abbr'},
                                        { name: 'step'}
                                        ],
                                        data: Desktop.GridWindow.getCCFDummyData()
                                    })
                                },{
                                    xtype: 'panel',
                                    id: 'grid-window-echart-ccf',
                                    layout: 'border',
                                    height: 450,
                                    items: [{
                                        xtype: 'panel',
                                        region: 'center',
                                        flex: 1,
                                        html: '<iframe id="iframe-ccf-result" style="width:100%;height:100%;border:0;"></iframe>',
                                        listeners: {
                                            render: function () {
                                                const iframe = document.getElementById('iframe-ccf-result');
                                                const body = iframe.contentDocument.body;
                                                body.style.overflow = 'hidden'; // !important
                                                body.style.margin = 0;
                                                body.style.padding = 0;
                                                
                                                const divEl = iframe.contentDocument.createElement('div');
                                                divEl.style.width = divEl.style.height = '100%';
                                                body.appendChild(divEl);
                                                Ext.echartCCFResultDivEl = divEl;

                                                Ext.echartCCFResult = echarts.init(divEl);
                                                iframe.contentWindow.onresize = Ext.echartCCFResult.resize;
                                            }
                                        } 
                                    },{
                                        xtype: 'grid',
                                        id: 'grid-window-ccf-result-table',
                                        title: 'CCF模拟计算值',
                                        region: 'east',
                                        width: 180,
                                        columns: [{
                                            text: '温度',
                                            dataIndex: 't',
                                            width: 60,
                                        },{
                                            text: 'CCF',
                                            dataIndex: 'ccf',
                                            flex: 1
                                        }],
                                        store: {
                                            fields: ['t', 'ccf']
                                        },
                                        tools: [{
                                            type: 'save',
                                            handler: function() {
                                                const grid = Ext.getCmp('grid-window-ccf-result-table');

                                                if (grid) {
                                                    let out = 't,ccf\r\n';
                                                    const items = grid.store.data.items;
                                                    for (const item of items) {
                                                        out += item.data.t + ',' + item.data.ccf + '\r\n'; 
                                                    }

                                                    if (saveAs) {
                                                        saveAs(new Blob([out], {type: 'text/plain;charset=utf-8'}), 'ccf.txt')
                                                    }
                                                }
                                                
                                            }
                                        }]
                                    }],
                                    
                                }
                            ],
                            tbar: [{
                                text: '分析',
                                handler: function () {
                                    const grid = Ext.getCmp('grid-window-data-source');
                                    const sel = grid ? grid.getSelection(): null;
                                    
                                    if (sel) {
                                        // 合并选中的测量文件
                                        const paramsGrid = Ext.getCmp('grid-window-ccf-params');
                                        const paramsData = paramsGrid ? paramsGrid.store.data.items: null;

                                        // 不同的软件版本可能有不同的变量名，使用统一的简称
                                        const params = {
                                            t:   { data: []},
                                            v:   { data: []},
                                            dv:  { data: []},
                                            dP1: { data: []},
                                            dP2: { data: []},
                                        };

                                        const channels = [];
                                        const returnedData = [];
                                        let n=0;
                                        let tMax, tMin, tStep, vMax, vMin, dvMax, dvMin;

                                        if (paramsData) {
                                            for (const item of paramsData) {
                                                const variableName = item.data.variableName;
                                                params[item.data.abbr].variableName = variableName;
                                                channels.push(variableName);

                                                switch (item.data.abbr) {
                                                    case 't':
                                                        tMax = item.data.max;
                                                        tMin = item.data.min;
                                                        tStep= item.data.step;
                                                        break;
                                                    case 'v':
                                                        vMax = item.data.max;
                                                        vMin = item.data.min;
                                                        break;
                                                    case 'dv':
                                                        dvMax = item.data.max;
                                                        dvMin = item.data.min;
                                                    default:
                                                        break;
                                                }
                                            }

                                            readFiles(sel);
                                        }

                                        // 提交数据
                                        
                                        function read(file) {
                                            return new Promise((resolve, reject) => {
                                                const worker = new Worker('./app/worker/mdfReadSignals.js');
                                                worker.postMessage({file, channels});
                                                worker.onmessage = function (e) {
                                                    n++;
                                                    const dataArraies = e.data;
                                                    returnedData.push(e.data);
                                                    for (const key in params) {
                                                        switch (key) {
                                                            case 't':
                                                                params[key].data = params[key].data.concat(dataArraies[0]);
                                                                break;
                                                            case 'v':
                                                                params[key].data = params[key].data.concat(dataArraies[1]);
                                                                break;
                                                            case 'dv':
                                                                params[key].data = params[key].data.concat(dataArraies[2]);
                                                                break;
                                                            case 'dP1':
                                                                params[key].data = params[key].data.concat(dataArraies[3]);
                                                                break;
                                                            case 'dP2':
                                                                params[key].data = params[key].data.concat(dataArraies[4]);
                                                                break;
                                                            default:
                                                                break;
                                                        }
                                                    }

                                                   
                                                    if (n === sel.length) {
                                                        console.log('已加载%s个文件', n, params);

                                                        // 利用tMax, tMin, tStep, vMax, vMin, dvMax, dvMin这些筛选条件，统计不同温度区间的CCF模拟计算值
                                                        (function ({params, tMax, tMin, tStep, vMax, vMin, dvMax, dvMin}) {
                                                            let {t, v, dv, dP1, dP2} = params;
                                                            let compute = false;
                                                            let tArray = [], dataArray = [], counter = 0, counter_c = 200, numerator = 0, denominator = 0;

                                                            console.log(tMax, tMin, tStep, vMax, vMin, dvMax, dvMin)

                                                            for (let i = tMin; i <= tMax; i += tStep) {
                                                                tArray.push(i);
                                                                dataArray.push([]);
                                                            }

                                                            

                                                            for (const [idx, ti] of t.data.entries()) {
                                                                for (let j = 0; j < tArray.length-1; j++) {
                                                                    if ( (ti >= tArray[j]) && ti <= tArray[j+1]) {
                                                                        // 温度条件确定，确认好数据装载容器
                                                                        let targetDataArray = dataArray[j];

                                                                        // 符合流量条件和流量梯度条件
                                                                        if (v.data[idx] >= vMin &&
                                                                            v.data[idx] <= vMax &&
                                                                            ((dv.data[idx] >= dvMin && dv.data[idx] <= dvMax) || (dv.data[idx] >= -dvMax && dv.data[idx] <= -dvMin))
                                                                            ) {
                                                                            
                                                                            counter ++;
                                                                            numerator   += dP1.data[idx] * dP2.data[idx];
                                                                            denominator += dP2.data[idx] * dP2.data[idx];

                                                                            if (counter >= counter_c) {
                                                                                targetDataArray.push( parseFloat((numerator / denominator).toFixed(3)) );

                                                                                // 计数器清零，分子、分母清零
                                                                                counter = 0;
                                                                                numerator = denominator = 0;
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            console.log(dataArray);

                                                            let echartData = [];
                                                            let echartData2 = [];   //各个温度区间的(max+min)/2

                                                            for (const [idx, item] of dataArray.entries()) {
                                                                const Ti = tArray[idx] + tStep/2;

                                                                if (item && item.length > 0) {
                                                                    echartData = echartData.concat(item.map( (val) => [Ti, val ]));
                                                                    echartData2.push([Ti, (Math.max.apply(null, item) + Math.min.apply(null, item))/2]);
                                                    
                                                                } else {
                                                                    echartData2.push([Ti, NaN]);
                                                                }

                                                                

                                                            }
                                                            
                                                            if (echartData && echartData.length > 0) {
                                                                // 更新散点图
                                                                const option = {
                                                                    xAxis: {},
                                                                    yAxis: {},
                                                                    title: {
                                                                        text: '温度区间 CCF计算值统计图',
                                                                        left: 'center'
                                                                    },
                                                                    grid: {
                                                                        top: 36,
                                                                        bottom: 23
                                                                    },
                                                                    series: [{
                                                                        type: 'scatter',
                                                                        data: echartData,
                                                                    },{
                                                                        type: 'line',
                                                                        data: echartData2
                                                                    }]
                                                                };
                                                                Ext.echartCCFResult.setOption(option);
    
                                                                // 更新表格数据
                                                                const resultGrid = Ext.getCmp('grid-window-ccf-result-table');
                                                                if (resultGrid) resultGrid.store.loadData(echartData);
                                                            }
                                                            

                                                        })({params, tMax, tMin, tStep, vMax, vMin, dvMax, dvMin})
                                                    }                                                   

                                                    resolve('receive message')
                                                }
                                            })
                                        }
    
                                        async function readFiles (sel) {
                                            for (const k of sel) {
                                                await read(k.data.file)
                                            }
                                        }
                                        
                                        
                                    }
                                }
                            }]
                        }]
                    }
                ],
                tbar:[{
                    text:'添加',
                    tooltip:'Add a new row',
                    iconCls:'add',
                    handler: function () {
                        document.getElementById('fileinput1').click();
                    }
                }, '-', {
                    text:'删除',
                    tooltip:'Remove the selected item',
                    iconCls:'remove',
                    handler: function () {
                        const grid = Ext.getCmp('grid-window-data-source');
                        grid.store.remove(grid.getSelection());
                        
                    }
                }],
            });
        }
        return win;
    },

    statics: {
        getDummyData: function () {
            
            return [
                ['3m Co',71.72,0.02,0.03],
                ['Alcoa Inc',29.01,0.42,1.47],
                ['American Express Company',52.55,0.01,0.02],
                ['American International Group, Inc.',64.13,0.31,0.49],
                ['AT&T Inc.',31.61,-0.48,1.54],
                ['Caterpillar Inc.',67.27,0.92,1.39],
                ['Citigroup, Inc.',49.37,0.02,0.04],
                ['Exxon Mobil Corp',68.1,-0.43,0.64],
                ['General Electric Company',34.14,-0.08,0.23],
                ['General Motors Corporation',30.27,1.09,3.74],
                ['Hewlett-Packard Co.',36.53,-0.03,0.08],
                ['Honeywell Intl Inc',38.77,0.05,0.13],
                ['Intel Corporation',19.88,0.31,1.58],
                ['Johnson & Johnson',64.72,0.06,0.09],
                ['Merck & Co., Inc.',40.96,0.41,1.01],
                ['Microsoft Corporation',25.84,0.14,0.54],
                ['The Coca-Cola Company',45.07,0.26,0.58],
                ['The Procter & Gamble Company',61.91,0.01,0.02],
                ['Wal-Mart Stores, Inc.',45.45,0.73,1.63],
                ['Walt Disney Company (The) (Holding Company)',29.89,0.24,0.81]
            ];
        },

        getCCFDummyData: function () {
            return [
                ['GPF温度', 'PFlt_tFilDevB1', 800, 300, 't', 50],
                ['流量', 'PFltSig_vfEgPfilCorrdFildB1', 100000, 0, 'v'],
                ['流量梯度', 'PFltSig_dvfEgPfilFildB1', 500, 35, 'dv'],
                ['压差梯度测量值', 'PFltSig_pDeltaPfilDifFildB1', '', '', 'dP1'],
                ['压差梯度模型值','PFltSig_pDeltaPfilDifRefB1', '', '', 'dP2']
            ]
        }
    }
});

