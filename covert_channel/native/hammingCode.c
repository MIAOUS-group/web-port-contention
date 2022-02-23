#include "hammingCode.h"

#include <stdio.h>


#define R1 3            // number of rows in Matrix 1
#define C1 7            // number of columns in Matrix 1
#define R2 7            // number of rows in Matrix 2
#define C2 1            // number of columns in Matrix 2

void mulMat(int mat1[R1][C1], int mat2[R2][C2], int rslt[R1][C2]) {
    for (int i = 0; i < R1; i++) {
        for (int j = 0; j < C2; j++) {
            rslt[i][j] = 0;
            for (int k = 0; k < R2; k++) {
                rslt[i][j] += mat1[i][k] * mat2[k][j];
            }
        }
    }
}


int hammingEncode(int *message, int *encodedMessage) {
  // Data bits:
  encodedMessage[2] = message[0];
  encodedMessage[4] = message[1];
  encodedMessage[5] = message[2];
  encodedMessage[6] = message[3];

  // Parity bits:
  encodedMessage[0] = message[0] ^ message[1] ^ message[3];
  encodedMessage[1] = message[0] ^ message[2] ^ message[3];
  encodedMessage[3] = message[1] ^ message[2] ^ message[3];
  encodedMessage[7] = encodedMessage[0] ^ encodedMessage[1] ^ encodedMessage[2] ^ encodedMessage[3] ^ encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6];

  return 1;
}

int hammingErrorCount(int *encodedMessage) {
  int correctCode = 1;
  correctCode &= (encodedMessage[0] == (encodedMessage[2] ^ encodedMessage[4] ^ encodedMessage[6]));
  correctCode &= (encodedMessage[1] == (encodedMessage[2] ^ encodedMessage[5] ^ encodedMessage[6]));
  correctCode &= (encodedMessage[3] == (encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6]));
  correctCode &= (encodedMessage[7] == (encodedMessage[0] ^ encodedMessage[1] ^ encodedMessage[2] ^ encodedMessage[3] ^ encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6]));
  if (correctCode) {
    return 0;
  }
  else {
    if (encodedMessage[7] != (encodedMessage[0] ^ encodedMessage[1] ^ encodedMessage[2] ^ encodedMessage[3] ^ encodedMessage[4] ^ encodedMessage[5] ^ encodedMessage[6])) { // Single error
      return 1;
    }
    else { // Double error
      return 2;
    }
  }
}


int hammingCorrectError(int *encodedMessage){
  int errorIndex = 0;
  int controlMatrix[R1][C1] = {
    {0,0,0,1,1,1,1},
    {0,1,1,0,0,1,1},
    {1,0,1,0,1,0,1}
  };

  int encodedMessageMat[R2][C2];
  for (int i = 0; i < CODED_BITS -1; i++) {
    encodedMessageMat[i][0] = encodedMessage[i];
  }
  int rslt[R1][C2];

  mulMat(controlMatrix, encodedMessageMat, rslt);
  errorIndex = (rslt[0][0]%2) * 4 + (rslt[0][1]%2) * 2 + (rslt[0][2]%2) - 1;
  encodedMessage[errorIndex] ^= 1; // Opposite bit;
  return 1;
}



int hammingDecode(int *encodedMessage, int *decodedMessage) {
  int errorCount = hammingErrorCount(encodedMessage);
  if (errorCount == 1) {
    // hammingCorrectError(encodedMessage);
    return -1;
  }
  else if (errorCount > 1) {
    return -1;
  }
  decodedMessage[0] = encodedMessage[2];
  decodedMessage[1] = encodedMessage[4];
  decodedMessage[2] = encodedMessage[5];
  decodedMessage[3] = encodedMessage[6];
  int sequenceNumber = decodedMessage[0]*8 + decodedMessage[1]*4 + decodedMessage[2]*2 + decodedMessage[3];
  return sequenceNumber;
}
