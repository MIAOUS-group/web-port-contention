#ifndef HAMMING_H
#define HAMMING_H

#define ACTUAL_BIT 4
#define PARITY_BITS 4
#define CODED_BITS ACTUAL_BIT + PARITY_BITS // 8

int hammingEncode(int *message, int *encodedMessage);
int hammingDecode(int *encodedMessage, int *decodedMessage);


#endif
