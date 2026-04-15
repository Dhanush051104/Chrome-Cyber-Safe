window.tf = {
    tensor2d(data) {
      return {
        data,
        shape: [data.length, data[0]?.length || 0]
      };
    },
  
    tensor1d(data) {
      return {
        data,
        shape: [data.length]
      };
    },
  
    matMul(a, b) {
      const aRows = a.shape[0];
      const aCols = a.shape[1];
      const bRows = b.shape[0];
      const bCols = b.shape[1];
  
      if (aCols !== bRows) {
        throw new Error("Matrix shape mismatch in matMul");
      }
  
      const result = Array.from({ length: aRows }, () => Array(bCols).fill(0));
  
      for (let i = 0; i < aRows; i++) {
        for (let j = 0; j < bCols; j++) {
          let sum = 0;
          for (let k = 0; k < aCols; k++) {
            sum += a.data[i][k] * b.data[k][j];
          }
          result[i][j] = sum;
        }
      }
  
      return {
        data: result,
        shape: [aRows, bCols]
      };
    },
  
    add(a, b) {
      const isMatrix = Array.isArray(a.data[0]);
  
      if (isMatrix) {
        const rows = a.shape[0];
        const cols = a.shape[1];
        const result = Array.from({ length: rows }, () => Array(cols).fill(0));
  
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            result[i][j] = a.data[i][j] + (Array.isArray(b.data) ? (b.data[j] ?? 0) : 0);
          }
        }
  
        return {
          data: result,
          shape: [rows, cols]
        };
      }
  
      return a;
    },
  
    sigmoid(t) {
      const isMatrix = Array.isArray(t.data[0]);
  
      if (isMatrix) {
        const rows = t.shape[0];
        const cols = t.shape[1];
        const result = Array.from({ length: rows }, () => Array(cols).fill(0));
  
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            result[i][j] = 1 / (1 + Math.exp(-t.data[i][j]));
          }
        }
  
        return {
          data: result,
          shape: [rows, cols]
        };
      }
  
      return t;
    }
  };