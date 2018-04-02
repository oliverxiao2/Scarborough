importScripts('mdf.0.9.1.js');
onmessage = function (e) {
    const reader = new FileReader;
    const file = e.data;
    reader.onload = function (e) {
        const result = e.target.result;
        const mdf = new MDF(result, false);
        const chs = mdf.searchChannelsByRegExp(/.*/);
        const names = [];
        for (let i=0; i<chs.length; i++) {
            const theCh = chs[i];
            // delete theCh.ccBlock;
            // delete theCh.comment;
            // delete theCh.parent;
            names.push({
                signalname:theCh.longSignalName,
                signalDescription: theCh.signalDescription,
            });
        }
        postMessage(names);
        close();
    };
    reader.readAsArrayBuffer(file);
};