/* revise log
  2017-11-11 MDF.0.9.1
  1. add new property "longSignalName" for cnBlock
  2. revise the method MDF.searchChannelsByReg, using longSignalName

*/

/* Conversion type (formula identifier)
 *  0 = parametric, linear
 *  1 = tabular with interpolation
 *  2 = tabular
 *  6 = polynomial function
 *  7 = exponential function
 *  8 = logarithmic function
 *  9 = rational conversion formula
 *  10 = ASAM-MCD2 Text formula
 *  11 = ASAM-MCD2 Text Table, (COMPU_VTAB)
 *  12 = ASAM-MCD2 Text Range Table (COMPU_VTAB_RANGE)
 *  132 = date (Based on 7 Byte Date data structure)
 *  133 = time (Based on 6 Byte Time data structure)
 *  65535 = 1:1 conversion formula (Int = Phys)
 */

CCBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.physicalValueRangeValid = null;
  this.minPhysicalSignalValue = null;
  this.maxPhysicalSignalValue = null;
  this.physicalUnit = null;
  this.conversionType = null;
  this.sizeInformation = null;
  this.additionalConversionData = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CCBlock.conversionFomulas = {
  0:  // 0 = parametric, linear
    function(rawData, params){
      return rawData * params[1] + params[0];
    },
  1:  // 1 = tabular with interpolation
    function(rawData, params){
      var Int_0 = params[0];
      if(rawData < Int_0){
        var Phys_0 = params[1];
        return Phys_0;
      }

      for(var i = 1; i < (params.length / 2); i++){
        var Int_i = params[2*i];
        if(rawData < Int_i){
          var Phys_i = params[2*i+1];
          var Int_i_1 = params[2*i-2];
          var Phys_i_1 = params[2*i-1];
          return Phys_i_1 + (Phys_i - Phys_i_1) / (Int_i - Int_i_1) * (rawData - Int_i_1);
        }
      }

      var Phys_n = params[params.length - 1];
      return Phys_n;
    },
  2:  // 2 = tabular
    function(rawData, params){
      var Int_0 = params[0];
      if(rawData < Int_0){
        var Phys_0 = params[1];
        return Phys_0;
      }

      for(var i = 1; i < (params.length / 2); i++){
        var Int_i = params[2*i];
        if(rawData < Int_i){
          var Phys_i_1 = params[2*i-1];
          return Phys_i_1;
        }
      }

      var Phys_n = params[params.length - 1];
      return Phys_n;
    },
  6:  // 6 = polynomial function
    function(rawData, params){
      return (params[1] - (params[3] * (rawData - params[4]))) / (params[2] * (rawData - params[4]) - params[0]);
    },
  7:  // 7 = exponential function
    function(rawData, params){
      if(params[3] == 0){
        return Math.log(((rawData - params[6]) * params[5] - params[2]) / params[0]) / params[1];
      }
      else if(params[0] == 0){
        return Math.log((params[2] / (rawData - params[6]) - params[5]) / params[3]) / params[4];
      }

      return null;
    },
  8:  // 8 = logarithmic function
    function(rawData, params){
      if(params[3] == 0){
        return Math.exp(((rawData - params[6]) * params[5] - params[2]) / params[0]) / params[1];
      }
      else if(params[0] == 0){
        return Math.exp((params[2] / (rawData - params[6]) - params[5]) / params[3]) / params[4];
      }

      return null;
    },
  9:  // 9 = rational conversion formula
    function(rawData, params){
      return (params[0] * rawData * rawData + params[1] * rawData + params[2]) / (params[3] * rawData * rawData + params[4] * rawData + params[5]);
    },
  10: // 10 = ASAM-MCD2 Text formula
    function(rawData, params){
      var eqnStr = params[0];  // an equation including X1
      if(!/[A-WYZa-z"'`]/.test(eqnStr) && !/X[^1]/.test(eqnStr)){
        try{
          var fcnStr = "return ( " + eqnStr + " )";
          var fcn = new Function("X1", fcnStr);
          var ans = fcn(rawData);
          return ans;
        }
        catch(e){
          var errMessage = "Error Message: " + e.message + ", Error Name: " + e.name;
          if(e.fileName)  str += ", File Name: " + e.fileName;
          if(e.lineNumber)  str +=", Line Number: " + e.lineNumber;
          console.log(errMessage);
        }
      }

      return null;
    },
  11: // 11 = ASAM-MCD2 Text Table, (COMPU_VTAB)
    function(rawData, params){
      var rowCount = params.length / 2;
      var minGap, temp;
      for(var i = 0; i < rowCount; i++){
        var Int_i = params[2*i];
        if(Int_i == rawData){
          return params[2*i+1];
        }
        else{
          if ((!minGap) || minGap >= Math.abs(Int_i - rawData)) {
            temp = params[2*i+1];
            minGap = Math.abs(Int_i - rawData);
          }
        }
      }

      return temp;
    },
  12: // 12 = ASAM-MCD2 Text Range Table (COMPU_VTAB_RANGE)
    function(rawData, params){
      return null;              // not supported yet.
    },
  132:  // 132 = date (Based on 7 Byte Date data structure)
    function(ary_u8, params, littleEndian){
      var abuf = ary_u8.buffer;
      var offset = 0;

      var data = new Array(6);

      var len = 2;
      data[0] = MDF.ab2uint16(abuf, offset, littleEndian);
      offset += len;

      for(var i = 1; i < data.length; i++){
        len = 1;
        data[i] = MDF.ab2uint8(abuf, offset);
        offset += len;
      }
      return data;
    },
  133:  // 133 = time (Based on 6 Byte Time data structure)
    function(ary_u8, params, littleEndian){
      var abuf = ary_u8.buffer;
      var offset = 0;

      var data = new Array(2);
      var len = 6;
      data[0] = MDF.ab2uint32(abuf, offset, littleEndian);
      offset += len;

      len = 2;
      data[1] = MDF.ab2uint16(abuf, offset, littleEndian);
      offset += len;
      return data;
    },
  65535:  // 65535 = 1:1 conversion formula (Int = Phys)
    function(rawData, params){
      return rawData;
    }
};

CCBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.physicalValueRangeValid = MDF.ab2bool(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.minPhysicalSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.maxPhysicalSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 20;
  this.physicalUnit = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.conversionType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.sizeInformation = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.setAdditinalConversionData(arrayBuffer, offset, littleEndian);
  offset += len;

  this.convert = (function(little){
    var convType = this.conversionType;
    var params = this.additionalConversionData;

    if(convType == 132 || convType == 133){
      return function(rawData){
        return CCBlock.conversionFomulas[convType](rawData, params, little);
      };
    }

    return function(rawData){
      return CCBlock.conversionFomulas[convType](rawData, params);
    };
  }).call(this, littleEndian);
};

CCBlock.prototype.setAdditinalConversionData = function(arrayBuffer, initialOffset, littleEndian){
  var data = [];
  var offset = initialOffset;

  switch(this.conversionType){
  case 0:
  case 6:
  case 7:
  case 8:
  case 9:
    data = new Array(this.sizeInformation);
    for(var i = 0; i < data.length; i++){
      var len = 8;
      data[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
      offset += len;
    }
    break;
  case 1:
  case 2:
    data = new Array(this.sizeInformation * 2);
    for(var i = 0; i < data.length; i++){
      var len = 8;
      data[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
      offset += len;
    }
    break;
  case 10:
    var len = 256;
    data = [ MDF.ab2str(arrayBuffer, offset, len) ];
    offset += len;
    break;
  case 11:
    data = new Array(this.sizeInformation * 2);
    for(var i = 0; i < this.sizeInformation; i++){
      var len = 8;
      data[2*i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
      offset += len;

      len = 32;
      data[2*i+1] = MDF.ab2str(arrayBuffer, offset, len);
      offset += len;
    }
    break;
  case 12:
    data = new Array( (this.sizeInformation + 1) * 3);
    try{
      for(var i = 0; i < this.sizeInformation + 1; i++){
        var len = 8;
        data[3*i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
        offset += len;

        len = 8;
        data[3*i+1] = MDF.ab2double(arrayBuffer, offset, littleEndian);
        offset += len;

        len = 4;
        data[3*i+2] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
        offset += len;
      }
    }
    catch(e){
      var errMessage = "Error Message: " + e.message + ", Error Name: " + e.name;
      if(e.fileName)  str += ", File Name: " + e.fileName;
      if(e.lineNumber)  str +=", Line Number: " + e.lineNumber;
      console.log(errMessage);
    }
    break;
  case 132:
    break;
  case 133:
    break;
  case 65535:
    break;
  }

  this.additionalConversionData = data;
};

// This is dummy function to advoid undefined error.
CCBlock.prototype.convert = function(rawData){
  return null;
};

CCBlock.prototype.convertAll = function(rawDataArray){
  var actDataArray = [];
  for(var i = 0; i < rawDataArray.length; i++){
    actDataArray.push(this.convert(rawDataArray[i]));
  }
  return actDataArray;
};

//-------------------------------------------------------//
CDBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.dependencyType = null;
  this.numberOfSignalsDependencies = null;
  this.pDGBlocks = [];
  this.pCGBlocks = [];
  this.pCNBlocks = [];
  this.sizeOfDimensions = [];

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CDBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.dependencyType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfSignalsDependencies = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  this.pDGBlocks = new Array(this.numberOfSignalsDependencies);
  this.pCGBlocks = new Array(this.numberOfSignalsDependencies);
  this.pCNBlocks = new Array(this.numberOfSignalsDependencies);
  for(var i = 0; i < this.numberOfSignalsDependencies; i++){
    len = 4;
    this.pDGBlocks[i] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.pCGBlocks[i] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.pCNBlocks[i] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  this.sizeOfDimensions = new Array(this.getDimension());
  for(var i = 0; i < this.sizeOfDimensions.length; i++){
    len = 2;
    this.sizeOfDimensions[i] = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;
  }
};

CDBlock.prototype.getDimension = function(){
  var dimension = 0;

  switch(this.dependencyType){
  case 0:
  case 1:
  case 2:
    dimension = this.dependencyType;
    break;
  default:
    if(this.dependencyType >= 256){
      dimension = this.dependencyType - 256;
    }
    break;
  }

  return dimension;
}

//-----------------------------------------------------//
CEBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.extensionType = null;
  this.additionalFields = [];

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CEBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.extensionType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.setAdditionalFields(arrayBuffer, offset, littleEndian);
  offset += len;
};

CEBlock.prototype.setAdditionalFields = function(arrayBuffer, initialOffset, littleEndian){
  var data = [];
  var offset = initialOffset;

  switch(this.extensionType){
  case 2:
    data = new Array(4);

    var len = 2;
    data[0] = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    data[1] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 80;
    data[2] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;

    len = 32;
    data[3] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;
    break;
  case 19:
    data = new Array(4);

    var len = 4;
    data[0] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    data[1] = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 36;
    data[2] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;

    len = 36;
    data[3] = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;
    break;
    break;
  }

  this.additionalFields = data;
};

//------------------------------------------------------//
CGBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextCGBlock = null;
  this.pFirstCNBlock = null;
  this.pComment = null;
  this.recordID = null;
  this.numberOfChannels = null;
  this.sizeOfDataRecord = null;
  this.numberOfRecords = null;
  this.pFirstSRBlock = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.cnBlocks = [];
  this.comment = null;
  this.srBlocks = [];

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CGBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextCGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFirstCNBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.recordID = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfChannels = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.sizeOfDataRecord = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.numberOfRecords = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  if(this.blockSize > (offset - blockOffset)){
    len = 4;
    this.pFirstSRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  this.setCNBlocks(arrayBuffer, this.pFirstCNBlock, littleEndian);
  this.setComment(arrayBuffer, this.pComment, littleEndian);
  this.setSRBlocks(arrayBuffer, this.pFirstSRBlock, littleEndian);
};

CGBlock.prototype.setCNBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var cnBlock = new CNBlock(arrayBuffer, offset, littleEndian, this);
    this.cnBlocks.push(cnBlock);
    offset = cnBlock.pNextCNBlock;
  }
};

CGBlock.prototype.setComment = function(arrayBuffer, initialOffset, littleEndian){
  if(initialOffset){
    this.comment = new TXBlock(arrayBuffer, initialOffset, littleEndian, this);
  }
};

CGBlock.prototype.setSRBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var srBlock = new SRBlock(arrayBuffer, offset, littleEndian, this);
    this.srBlocks.push(srBlock);
    offset = srBlock.pNextSRBlock;
  }
};

CGBlock.prototype.indexOfTimeChannel = function(){
  for(var i = 0; i < this.cnBlocks.length; i++){
    var cn = this.cnBlocks[i];
    if(cn.isTimeChannel())  return i;
  }

  return -1;
};

CGBlock.prototype.timeChannel = function(){
  var idx = this.indexOfTimeChannel();
  if(idx >= 0)  return this.cnBlocks[idx];

  return null;
};

//------------------------------------------------------//
/* Signal data type
 * Note: for 0-3 the default Byte order defined in IDBLOCK is used,
 * for 9-16 the default Byte order is overruled!
 * --------------------------------------------------------------------
 * 0 = unsigned integer                                 | Default Byte
 * 1 = signed integer (two's complement)                | order from
 * 2 = IEEE 754 floating-point format FLOAT (4 bytes)   | IDBLOCK
 * 3 = IEEE 754 floating-point format DOUBLE (8 bytes)  |
 * --------------------------------------------------------------------
 * 4 = VAX floating-point format (F_Float)              |
 * 5 = VAX floating-point format (G_Float)              | obsolete
 * 6 = VAX floating-point format (D_Float)              |
 * --------------------------------------------------------------------
 * 7 = String (NULL terminated)
 * 8 = Byte Array (max. 8191 Bytes, constant record length!)
 * --------------------------------------------------------------------
 * 9 = unsigned integer                                 | Big Endian
 * 10 = signed integer (two fs complement)              | (Motorola)
 * 11 = IEEE 754 floating-point format FLOAT (4 bytes)  | Byte order
 * 12 = IEEE 754 floating-point format DOUBLE (8 bytes) |
 * --------------------------------------------------------------------
 * 13 = unsigned integer                                | Little Endian
 * 14 = signed integer (two fs complement)              | (Intel)
 * 15 = IEEE 754 floating-point format FLOAT (4 bytes)  | Byte order
 * 16 = IEEE 754 floating-point format DOUBLE (8 bytes) |
 * --------------------------------------------------------------------
 */

CNBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextCNBlock = null;
  this.pCCBlock = null;
  this.pCEBlock = null;
  this.pCDBlock = null;
  this.pComment = null;
  this.channelType = null;
  this.shortSignalName = null;
  this.signalDescription = null;
  this.startOffsetInBits = null;
  this.numberOfBits = null;
  this.signalDataType = null;
  this.valueRangeValid = null;
  this.minSignalValue = null;
  this.maxSignalValue = null;
  this.samplingRate = null;

  this.pLongSignalName = null;
  this.pDisplayName = null;
  this.additionalByteOffset = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.ccBlock = null;
  this.ceBlock = null;
  this.cdBlock = null;
  this.comment = null;

  this.rawDataArray = [];

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

CNBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextCNBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pCCBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pCEBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pCDBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.channelType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 32;
  this.shortSignalName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 128;
  this.signalDescription = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.startOffsetInBits = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfBits = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.signalDataType = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.valueRangeValid = MDF.ab2bool(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.minSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.maxSignalValue = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.samplingRate = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;

  if( this.blockSize > (offset - blockOffset) ){
    len = 4;
    this.pLongSignalName = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    this.longSignalName = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer, this.pLongSignalName, 64)).split('\0')[1];
    offset += len;
  }

  if( this.blockSize > (offset - blockOffset) ){
    len = 4;
    this.pDisplayName = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if( this.blockSize > (offset - blockOffset) ){
    len = 2;
    this.additionalByteOffset = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.pCCBlock)  this.ccBlock = new CCBlock(arrayBuffer, this.pCCBlock, littleEndian, this);
  if(this.pCEBlock)  this.ceBlock = new CEBlock(arrayBuffer, this.pCEBlock, littleEndian, this);
  if(this.pCDBlock)  this.cdBlock = new CDBlock(arrayBuffer, this.pCDBlock, littleEndian, this);
  if(this.pComment)  this.comment = new TXBlock(arrayBuffer, this.pComment, littleEndian, this);


  // method override
  this.readRawData = (function(littleEndianDefault){
    if(this.isUint()){
      var thisByteOffset = this.byteOffset();
      var thisBitOffset = this.bitOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      var byteLength = Math.ceil((thisBitOffset + this.numberOfBits) / 8);
      var bitmask = 0xFF >>> ((8 - ((thisBitOffset + this.numberOfBits) % 8)) % 8);

      if(thisBitOffset == 0){
        switch(this.numberOfBits){
        case 8:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint8(arrayBuffer, theOffset);
          };
          break;
        case 16:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint16(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 32:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint32(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 64:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2uint64(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        default:
          if(this.numberOfBits < 8){
            return function(arrayBuffer, recordOffset){
              var theOffset = recordOffset + thisByteOffset;
              return bitmask & MDF.ab2uint8(arrayBuffer, theOffset);
            };
          }
          break;
        }
      }

      if(cnLittleEndian == false){
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          var index = uint8Array.length - 1;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += uint8Array[index] * Math.pow(2, 8 * i - thisBitOffset);
            index--;
          }
          var maskedVal = uint8Array[index] & bitmask;  // uint8Array[index] == MSB byte.
          ans += maskedVal * Math.pow(2, 8 * i - thisBitOffset);

          return ans;
        };
      }
      else {
      /*
      Emergency! Bug: sometimes, the bool channel could get raw data of 0.5, 1.5 or other float number.
      for example, B_sbbvk in 5.dat, index = 583, value = 0.5, offset = 305438
      */
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += Math.floor(uint8Array[i] * Math.pow(2, 8 * i - thisBitOffset));
          }
          var maskedVal = uint8Array[i] & bitmask;  // uint8Array[index] == MSB byte.
          ans += Math.floor(maskedVal * Math.pow(2, 8 * i - thisBitOffset));

          return ans;
        };
      }
    }
    else if(this.isInt()){
      var thisByteOffset = this.byteOffset();
      var thisBitOffset = this.bitOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      var byteLength = Math.ceil((this.bitOffset() + this.numberOfBits) / 8);
      var bitmask = 0xFF >>> ((8 - ((this.bitOffset() + this.numberOfBits) % 8)) % 8);

      if(thisBitOffset == 0){
        switch(this.numberOfBits){
        case 8:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int8(arrayBuffer, theOffset);
          };
          break;
        case 16:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int16(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 32:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int32(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        case 64:
          return function(arrayBuffer, recordOffset){
            var theOffset = recordOffset + thisByteOffset;
            return MDF.ab2int64(arrayBuffer, theOffset, cnLittleEndian);
          };
          break;
        default:
          if(this.numberOfBits < 8){
            return function(arrayBuffer, recordOffset){
              var theOffset = recordOffset + thisByteOffset;
              var maskedVal = bitmask & MDF.ab2uint8(arrayBuffer, theOffset);
              var flag = (bitmask ^ (bitmask >>> 1)) & maskedVal;
              var flaggedVal = (flag == 0) ? maskedVal : (maskedVal - bitmask - 1);
              return flaggedVal;
            };
          }
          break;
        }
      }

      if(cnLittleEndian == false){
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          var index = uint8Array.length - 1;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += uint8Array[index] * Math.pow(2, 8 * i - thisBitOffset);
            index--;
          }
          var maskedVal = uint8Array[index] & bitmask;  // uint8Array[index] == MSB byte.
          var flag = (bitmask ^ (bitmask >>> 1)) & maskedVal;
          var flaggedVal = (flag == 0) ? maskedVal : (maskedVal - bitmask - 1);
          ans += flaggedVal * Math.pow(2, 8 * i - thisBitOffset);

          return ans;
        };
      }
      else {
        return function(arrayBuffer, recordOffset){
          var theOffset = recordOffset + thisByteOffset;

          var uint8Array = MDF.ab2bytes(arrayBuffer, theOffset, byteLength);

          var ans = 0;
          var i;
          for(i = 0; i < uint8Array.length - 1; i++){
            ans += uint8Array[i] * Math.pow(2, 8 * i - thisBitOffset);
          }
          var maskedVal = uint8Array[i] & bitmask;  // uint8Array[index] == MSB byte.
          var flag = (bitmask ^ (bitmask >>> 1)) & maskedVal;
          var flaggedVal = (flag == 0) ? maskedVal : (maskedVal - bitmask - 1);
          ans += flaggedVal * Math.pow(2, 8 * i - thisBitOffset);

          return ans;
        };
      }
    }
    else if(this.isFloat()){
      var thisByteOffset = this.byteOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2float(arrayBuffer, theOffset, cnLittleEndian);
      };
    }
    else if(this.isDouble()){
      var thisByteOffset = this.byteOffset();
      var cnLittleEndian = (this.isDefaultByteOrder() == false) ? this.isLittleEndian() : littleEndianDefault;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2double(arrayBuffer, theOffset, cnLittleEndian);
      };
    }
    else if(this.isString()){
      var thisByteOffset = this.byteOffset();
      var theLen = this.numberOfBits / 8;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2str(arrayBuffer, theOffset, theLen);
      };
    }
    else if(this.isByteArray()){
      var thisByteOffset = this.byteOffset();
      var theLen = this.numberOfBits / 8;

      return function(arrayBuffer, recordOffset){
        var theOffset = recordOffset + thisByteOffset;
        return MDF.ab2bytes(arrayBuffer, theOffset, theLen);
      };
    }

    // if the signal data type is invalid
    return this.readRawData;   // return original (dummy) function

  }).call(this, littleEndian);
};

CNBlock.prototype.isTimeChannel = function(){
  var ans = null;
  if(this.channelType != null) ans = (this.channelType == 1);
  return ans;
};

CNBlock.prototype.byteOffset = function(){
  var ans = parseInt(this.startOffsetInBits / 8);
  if(this.additionalByteOffset != null) ans += this.additionalByteOffset;
  return ans;
};

CNBlock.prototype.bitOffset = function(){
  var ans = this.startOffsetInBits % 8;
  return ans;
};

CNBlock.prototype.isUint = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 0 || this.signalDataType == 9 || this.signalDataType == 13);
  }
  return ans;
};

CNBlock.prototype.isInt = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 1 || this.signalDataType == 10 || this.signalDataType == 14);
  }
  return ans;
};

CNBlock.prototype.isFloat = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 2 || this.signalDataType == 11 || this.signalDataType == 15);
  }
  return ans;
};

CNBlock.prototype.isDouble = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 3 || this.signalDataType == 12 || this.signalDataType == 16);
  }
  return ans;
};

CNBlock.prototype.isString = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 7);
  }
  return ans;
};

CNBlock.prototype.isByteArray = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 8);
  }
  return ans;
};

CNBlock.prototype.isDefaultByteOrder = function(){
  var ans = null;
  if(this.signalDataType != null){
    ans = (this.signalDataType == 0 || this.signalDataType == 1 || this.signalDataType == 2 || this.signalDataType == 3);
  }
  return ans;
};

CNBlock.prototype.isBigEndian = function(){
  var ans = null;
  if(this.signalDataType == 9 || this.signalDataType == 10 || this.signalDataType == 11 || this.signalDataType == 12){
    ans = true;
  }
  else if(this.signalDataType == 13 || this.signalDataType == 14 || this.signalDataType == 15 || this.signalDataType == 16){
    ans = false;
  }
  return ans;
};

CNBlock.prototype.isLittleEndian = function(){
  var ans = null;
  if(this.signalDataType == 9 || this.signalDataType == 10 || this.signalDataType == 11 || this.signalDataType == 12){
    ans = false;
  }
  else if(this.signalDataType == 13 || this.signalDataType == 14 || this.signalDataType == 15 || this.signalDataType == 16){
    ans = true;
  }
  return ans;
};

// This is dummy function to advoid undefined error.
CNBlock.prototype.readRawData = function(arrayBuffer, recordOffset){
  return null;
};

CNBlock.prototype.pushRawData = function(arrayBuffer, recordOffset){
  var rawData = this.readRawData(arrayBuffer, recordOffset);

  var arrayLength = this.rawDataArray.push(rawData);
  return arrayLength;
};

CNBlock.prototype.getPhysicalDataArray = function(){
  return this.ccBlock.convertAll(this.rawDataArray);
};

//--------------------------------------------------------------------//
DGBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextDGBlock = null;
  this.pFirstCGBlock = null;
  this.pTRBlock = null;
  this.pDataBlock = null;
  this.numberOfChannelGroups = null;
  this.numberOfRecordIDs = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.trBlock = null;
  this.cgBlocks = [];

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

DGBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextDGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFirstCGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pTRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pDataBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfChannelGroups = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfRecordIDs = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  this.setCGBlocks(arrayBuffer, this.pFirstCGBlock, littleEndian);
  this.setTRBlock(arrayBuffer, this.pTRBlock, littleEndian);
};

DGBlock.prototype.setCGBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var cgBlock = new CGBlock(arrayBuffer, offset, littleEndian, this);
    this.cgBlocks.push(cgBlock);
    offset = cgBlock.pNextCGBlock;
  }
};

DGBlock.prototype.setTRBlock = function(arrayBuffer, initialOffset, littleEndian){
  if(initialOffset){
    this.trBlock = new TRBlock(arrayBuffer, initialOffset, littleEndian, this);
  }
};

DGBlock.prototype.isSorted = function(){
  return (this.cgBlocks.length == 1);
};

DGBlock.prototype.readDataBlock = function(arrayBuffer, littleEndian){
  var offset = this.pDataBlock;

  if(offset){
    if(this.isSorted() == false){
      var cgCounters = (new Array(this.cgBlocks.length)).fill(0); // Zeros(this.cgBlocks.length);

      while(true){
        var cgIndex = 0;
        var currentRecordID = MDF.ab2uint8(arrayBuffer, offset);
        for(var i = 0; i < this.cgBlocks.length; i++){
          if(this.cgBlocks[i].recordID == currentRecordID){
            cgIndex = i;
            break;
          }
        }
        var currentCGBlock = this.cgBlocks[cgIndex];

        /* if(this.numberOfRecordIDs > 0) */  offset += 1;
        for(var i = 0; i < currentCGBlock.cnBlocks.length; i++){
          var theCNBlock = currentCGBlock.cnBlocks[i];
          theCNBlock.rawDataArray[cgCounters[cgIndex]] = theCNBlock.readRawData(arrayBuffer, offset);
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;

        cgCounters[cgIndex]++;

        var isEndOfDataBlock = true;
        for(var i = 0; i < this.cgBlocks.length; i++){
          if(cgCounters[i] < this.cgBlocks[i].numberOfRecords){
            isEndOfDataBlock = false;
            break;
          }
        }
        if(isEndOfDataBlock) break;
      }
    }
    else {  // this.isSorted() == true
      var currentCGBlock = this.cgBlocks[0];
      for(var cgCounter = 0; cgCounter < currentCGBlock.numberOfRecords; cgCounter++){

        if(this.numberOfRecordIDs > 0)  offset += 1;

        for(var i = 0; i < currentCGBlock.cnBlocks.length; i++){
          var theCNBlock = currentCGBlock.cnBlocks[i];
          theCNBlock.rawDataArray[cgCounter] = theCNBlock.readRawData(arrayBuffer, offset);
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }
    }
  }
};

DGBlock.prototype.readDataBlockAt = function(arrayBuffer, indexes, littleEndian){
  var cgIndex = indexes[0];
  var currentCGBlock = this.cgBlocks[cgIndex];
  var cnIndex = indexes[1];
  var theCNBlock = currentCGBlock.cnBlocks[cnIndex];

  this.readDataBlockOf(arrayBuffer, theCNBlock, littleEndian);

  return theCNBlock;
};

DGBlock.prototype.readDataBlockOf = function(arrayBuffer, theCNBlock, littleEndian){
  var offset = this.pDataBlock;

  var currentCGBlock = theCNBlock.parent;

  if(offset){
    if(this.isSorted() == false){
      var startPoint = (theCNBlock.rawDataArray.length) ? theCNBlock.rawDataArray.length : 0;

      var cgCounter = 0;
      while(cgCounter < startPoint){
        var currentRecordID = MDF.ab2uint8(arrayBuffer, offset);
        /* if(this.numberOfRecordIDs > 0) */  offset += 1;

        if(currentCGBlock.recordID == currentRecordID){
          cgCounter++;
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }

      while(cgCounter < currentCGBlock.numberOfRecords){
        var currentRecordID = MDF.ab2uint8(arrayBuffer, offset);
        /* if(this.numberOfRecordIDs > 0) */  offset += 1;

        if(currentCGBlock.recordID == currentRecordID){
          theCNBlock.pushRawData(arrayBuffer, offset);
          cgCounter++;
        }

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }
    }
    else {  // this.isSorted() == true
      var startPoint = (theCNBlock.rawDataArray.length) ? theCNBlock.rawDataArray.length : 0;

      var cgCounter = 0;
      for(; cgCounter < startPoint; cgCounter++){
        if(this.numberOfRecordIDs > 0)  offset += 1;

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }

      for(; cgCounter < currentCGBlock.numberOfRecords; cgCounter++){
        if(this.numberOfRecordIDs > 0)  offset += 1;

        theCNBlock.pushRawData(arrayBuffer, offset);

        offset += currentCGBlock.sizeOfDataRecord;
        if(this.numberOfRecordIDs >= 2)  offset += 1;
      }
    }
  }

  return theCNBlock;
};

//------------------------------------------------------------------------//
HDBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  // members
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pFirstDGBlock = null;
  this.pFileComment = null;
  this.pPRBlock = null;
  this.numberOfDataGroups = null;
  this.date = null;
  this.time = null;
  this.authorName = null;
  this.organizationName = null;
  this.projectName = null;
  this.subject = null;
  this.timeStamp = null;
  this.UTCTimeOffset = null;
  this.timeQualityClass = null;
  this.timerIdentification = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;
  this.fileComment = null;
  this.prBlock = null;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

// member functions
HDBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFirstDGBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pFileComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pPRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfDataGroups = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 10;
  this.date = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 8;
  this.time = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.authorName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.organizationName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.projectName = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 32;
  this.subject = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  if(this.blockSize > (offset - blockOffset)){
    len = 8;
    this.timeStamp = MDF.ab2uint64(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.blockSize > (offset - blockOffset)){
    len = 2;
    this.UTCTimeOffset = MDF.ab2int16(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.blockSize > (offset - blockOffset)){
    len = 2;
    this.timeQualityClass = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  if(this.blockSize > (offset - blockOffset)){
    len = 32;
    this.timerIdentification = MDF.ab2str(arrayBuffer, offset, len);
    offset += len;
  }


  if(this.pFileComment){
    this.fileComment = new TXBlock(arrayBuffer, this.pFileComment, littleEndian, this);
  }

  if(this.pPRBlock){
    this.prBlock = new PRBlock(arrayBuffer, this.pPRBlock, littleEndian, this);
  }

};

//-----------------------------------------------------------------------//
IDBlock = function(arrayBuffer, blockOffset, _parent){
  // members
  this.fileIdentifier = null;
  this.formatIdentifier = null;
  this.programIdentifier = null;
  this.defaultByteOrder = null;
  this.defaultFloatingPointFormat = null;
  this.versionNumber = null;
  this.codePageNumber = null;
  this.standardFlags  = null;
  this.customFlags = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset);
};

// member functions
IDBlock.prototype.initiallize = function(arrayBuffer, blockOffset){
  var offset = blockOffset;
  var len;

  len = 8;
  this.fileIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 8;
  this.formatIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 8;
  this.programIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.defaultByteOrder = MDF.ab2uint16(arrayBuffer, offset, true);
  offset += len;

  var littleEndian = (this.defaultByteOrder == 0);

  len = 2;
  this.defaultFloatingPointFormat = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.versionNumber = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.codePageNumber = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  // reserved
  offset += len;

  len = 26;
  // reserved
  offset += len;

  len = 2;
  this.standardFlags = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.customFlags = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;
};

IDBlock.prototype.isLittleEndian = function(){
  var ans = null;
  if(this && (this.defaultByteOrder != null)) ans = (this.defaultByteOrder == 0);
  return ans;
};

//---------------------------------------------------------------------------//
PRBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.programSpecificData = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

PRBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.programSpecificData = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;
};

//--------------------------------------------------------------------------------//
SRBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pNextSRBlock = null;
  this.pDataBlock = null;
  this.numberOfReducedSamples = null;
  this.lengthOfTimeInterval = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

SRBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pNextSRBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pDataBlock = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.numberOfReducedSamples = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 8;
  this.lengthOfTimeInterval = MDF.ab2double(arrayBuffer, offset, littleEndian);
  offset += len;
};

//----------------------------------------------------------------------------------//
TRBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.pTriggerComment = null;
  this.numberOfTriggerEvents = null;
  this.triggerTimes = [];
  this.preTriggerTimes = [];
  this.postTriggerTimes = [];

  this.triggerComment = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

TRBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 4;
  this.pTriggerComment = MDF.ab2uint32(arrayBuffer, offset, littleEndian);
  offset += len;

  len = 2;
  this.numberOfTriggerEvents = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  this.triggerTimes = new Array(this.numberOfTriggerEvents);
  this.preTriggerTimes = new Array(this.numberOfTriggerEvents);
  this.postTriggerTimes = new Array(this.numberOfTriggerEvents);
  for(var i = 0; i < this.numberOfTriggerEvents; i++){
    if( ( offset - blockOffset ) >= this.blockSize )  break;

    len = 4;
    this.triggerTimes[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.preTriggerTimes[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
    offset += len;

    len = 4;
    this.postTriggerTimes[i] = MDF.ab2double(arrayBuffer, offset, littleEndian);
    offset += len;
  }

  this.setTriggerComment(arrayBuffer, this.pTriggerComment, littleEndian);
};

TRBlock.prototype.setTriggerComment = function(arrayBuffer, initialOffset, littleEndian){
  if(initialOffset){
    this.triggerComment = new TXBlock(arrayBuffer, initialOffset, littleEndian, this);
  }
};

//---------------------------------------------------------------------------------//
TXBlock = function(arrayBuffer, blockOffset, littleEndian, _parent){
  this.blockTypeIdentifier = null;
  this.blockSize = null;
  this.text = null;

  this.pThisBlock = blockOffset;
  this.parent = _parent;

  this.initiallize(arrayBuffer, blockOffset, littleEndian);
};

TXBlock.prototype.initiallize = function(arrayBuffer, blockOffset, littleEndian){
  var offset = blockOffset;
  var len;

  len = 2;
  this.blockTypeIdentifier = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;

  len = 2;
  this.blockSize = MDF.ab2uint16(arrayBuffer, offset, littleEndian);
  offset += len;

  len = this.blockSize - ( offset - blockOffset );
  this.text = MDF.ab2str(arrayBuffer, offset, len);
  offset += len;
};

//----------------------------------------------------------------------------------//
MDF = function(arrayBuffer, f_read){
  // members
  this.idBlock = null;
  this.hdBlock = null;
  this.dgBlocks = [];
  this.arrayBuffer = null;

  this.initiallize(arrayBuffer);
  if(f_read != false) this.readDataBlocks(arrayBuffer);
  else  this.arrayBuffer = arrayBuffer;
};

// static functions
MDF.ab2bytes = function(arrayBuffer, offset, len){
  var ary_u8 = new Uint8Array(arrayBuffer, offset, len);
  return ary_u8;
};
MDF.ab2str = function(arrayBuffer, offset, len){
  var ary_u8 = new Uint8Array(arrayBuffer, offset, len);
  var str_with_nul = String.fromCharCode.apply(null, ary_u8);
  return str_with_nul.split('\0')[0];
};
MDF.ab2uint8 = function(arrayBuffer, offset){
  var dataView = new DataView(arrayBuffer, offset, 1);
  return dataView.getUint8(0);
};
MDF.ab2int8 = function(arrayBuffer, offset){
  var dataView = new DataView(arrayBuffer, offset, 1);
  return dataView.getInt8(0);
};
MDF.ab2uint16 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 2);
  return dataView.getUint16(0, littleEndian);
};
MDF.ab2int16 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 2);
  return dataView.getInt16(0, littleEndian);
};
MDF.ab2uint32 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 4);
  return dataView.getUint32(0, littleEndian);
};
MDF.ab2int32 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 4);
  return dataView.getInt32(0, littleEndian);
};
MDF.ab2uint64 = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 8);
  var uint32_first = dataView.getUint32(0, littleEndian);
  var uint32_last = dataView.getUint32(4, littleEndian);
  return (littleEndian) ? (uint32_first + (uint32_last * 0x100000000)) : (uint32_last + (uint32_first * 0x100000000));
};
MDF.ab2int64 = function(arrayBuffer, offset, littleEndian){
  var ans;
  var dataView = new DataView(arrayBuffer, offset, 8);
  if(littleEndian){
    var uint32_first = dataView.getUint32(0, littleEndian);
    var int32_last = dataView.getInt32(4, littleEndian);
    ans = uint32_first + (int32_last * 0x100000000);
  }
  else {
    var int32_first = dataView.getInt32(0, littleEndian);
    var uint32_last = dataView.getUint32(4, littleEndian);
    ans = uint32_last + (int32_first * 0x100000000);
  }
  return ans;
};
MDF.ab2bool = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 2);
  return (dataView.getUint16(0, littleEndian) != 0);
};
MDF.ab2float = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 4);
  return dataView.getFloat32(0, littleEndian);
};
MDF.ab2double = function(arrayBuffer, offset, littleEndian){
  var dataView = new DataView(arrayBuffer, offset, 8);
  return dataView.getFloat64(0, littleEndian);
};

MDF.str2u8arr = function(str){
  var ary_u8 = new Uint8Array(str.length);
  for(var i = 0; i < str.length; i++){
    ary_u8[i] = str.charCodeAt(i);
  }
  return ary_u8;
};

// member functions
MDF.prototype.initiallize = function(arrayBuffer){
  var offset = 0;
  this.idBlock = new IDBlock(arrayBuffer, offset, this);

  var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);

  offset = 64;
  this.hdBlock = new HDBlock(arrayBuffer, offset, littleEndian, this);

  offset = this.hdBlock.pFirstDGBlock;
  this.setDGBlocks(arrayBuffer, offset, littleEndian);
};

MDF.prototype.setDGBlocks = function(arrayBuffer, initialOffset, littleEndian){
  var offset = initialOffset;

  while(offset){
    var dg = new DGBlock(arrayBuffer, offset, littleEndian, this);
    this.dgBlocks.push(dg);
    offset = dg.pNextDGBlock;
  }
};

MDF.prototype.readDataBlocks = function(arrayBuffer){
  if(arrayBuffer){
    var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);
    for(var i = 0; i < this.dgBlocks.length; i++){
      var dg = this.dgBlocks[i];
      dg.readDataBlock(arrayBuffer, littleEndian);
    }
  }
  else if(this.arrayBuffer){
    this.readDataBlocks(this.arrayBuffer);
  }
};

MDF.prototype.readDataBlockAt = function(indexes, arrayBuffer){
  if(arrayBuffer){
    var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);
    var dgIndex = indexes[0];
    var dg = this.dgBlocks[dgIndex];
    var cn = dg.readDataBlockAt(arrayBuffer, indexes.slice(1), littleEndian);
    return cn;
  }
  else if(this.arrayBuffer){
    return this.readDataBlockAt(indexes, this.arrayBuffer);
  }
  return null;
};

MDF.prototype.readDataBlockOf = function(cnBlock, arrayBuffer){
  if(arrayBuffer){
    var littleEndian = this.idBlock.isLittleEndian(); // (this.idBlock.defaultByteOrder == 0);
    var dg = cnBlock.parent.parent;
    dg.readDataBlockOf(arrayBuffer, cnBlock, littleEndian);
    return cnBlock;
  }
  else if(this.arrayBuffer){
    return this.readDataBlockOf(cnBlock, this.arrayBuffer);
  }
  return null;
};

MDF.prototype.searchIndexesIf = function(func){
  var indexesArray = [];

  for(var i = 0; i < this.dgBlocks.length; i++){
    var dg = this.dgBlocks[i];
    for(var j = 0; j < dg.cgBlocks.length; j++){
      var cg = dg.cgBlocks[j];
      for(var k = 0; k < cg.cnBlocks.length; k++){
        var cn = cg.cnBlocks[k];
        if(func(cn, cg, dg, k, j, i)) indexesArray.push([i, j, k, cn]);
      }
    }
  }

  return indexesArray;
};

MDF.prototype.searchChannelsIf = function(func){
  var indexesArray = this.searchIndexesIf(func);
  var cnArray = [];
  for(var i = 0; i < indexesArray.length; i++){
    var idx = indexesArray[i];
    cnArray.push(this.dgBlocks[idx[0]].cgBlocks[idx[1]].cnBlocks[idx[2]]);
  }
  return cnArray;
};

MDF.prototype.searchIndexesByRegExp = function(regexp){
  var func = (function(regexp, cn){
    return cn.shortSignalName.search(regexp) != -1;
  }).bind(this, regexp);
  var indexesArray = this.searchIndexesIf(func);

  return indexesArray;
};


MDF.prototype.searchChannelsByRegExp = function(regexp){
  var func = (function(regexp, cn){
    return cn.longSignalName.search(regexp) != -1;
  }).bind(this, regexp);
  var cnArray = this.searchChannelsIf(func);

  return cnArray;
};

MDF.prototype.resample = function (dT) {
  
}
