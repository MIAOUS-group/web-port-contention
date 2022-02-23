CFLAGS += -g -Wall -O0 -lm -lpthread -Wno-maybe-uninitialized
WASM = wat2wasm

WAT_DIR := ./wasm
SRC_DIR := ./native
OBJ_DIR := ./build

all: ctz_spam rem_spam covert_channel

ctz_spam:
	$(WASM) $(WAT_DIR)/ctz_spam.wat -o $(OBJ_DIR)/ctz_spam.wasm

rem_spam:
	$(WASM) $(WAT_DIR)/rem_spam.wat -o $(OBJ_DIR)/rem_spam.wasm

covert_channel: native/covertChannel.c native/thresholdDetection.c native/denStreamDetection.c native/DenStream.c native/MicroCluster.c native/config.h native/receiver.c native/frame.c native/p1_spam.S native/frame.c native/p1_time.c native/p1_time.S native/utils.c native/sendBit.c native/sender.c native/hammingCode.c
	$(CC) -o build/covertChannel $^ $(CFLAGS)

clean:
	rm build/*
