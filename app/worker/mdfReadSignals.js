importScripts('mdf.0.9.1.js');
onmessage = function (e) {
    const {file, channels} = e.data;
    const reader = new FileReader();
    reader.onload = function (e) {
        const result = e.target.result;
        const mdf = new MDF(result, false);
        const returnDataArray = [];
        for (let channel of channels) {

            // 传递的参数通道名称，有时会带设备名，有时不带，查找时需要注意
            let searchResult = mdf.searchChannelsIf(function(ch){
                let lName = ch.longSignalName, sName;
                const flag = lName.indexOf('\\');
                if (flag != -1) sName = lName.substring(0, flag);

                if (channel === lName || channel === sName) return true;
            });

            searchResult = searchResult && searchResult[0];
            if (searchResult) {
                mdf.readDataBlockOf(searchResult, mdf.arrayBuffer);
                
                let dataArray;
                const conversionType = searchResult.ccBlock.conversionType;
                if ( conversionType === 0 || conversionType === 9 ) {
                    dataArray = (searchResult.ccBlock.convertAll(searchResult.rawDataArray));
                } else {
                    dataArray = (searchResult.rawDataArray);
                }
                
                returnDataArray.push(dataArray);
            } else {
                //
            }
        }
        postMessage(returnDataArray);
        //close();
    }
    reader.readAsArrayBuffer(file);
}