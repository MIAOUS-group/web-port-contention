CFLAGS += -g -Wall -O0 -lm -lpthread -Wno-maybe-uninitialized
WASM = wat2wasm

WAT_DIR := ./wasm
SRC_DIR := ./native
OBJ_DIR := ./build
WAT_FILES := $(wildcard $(WAT_DIR)/*.wat)
OBJ_FILES := $(patsubst $(WAT_DIR)/%.wat,$(OBJ_DIR)/%.wasm,$(WAT_FILES))


all: ctz_spam rem_spam covert_channel

ctz_spam:
	$(WASM) $(WAT_DIR)/ctz_spam.wat -o $(OBJ_DIR)/ctz_spam.wasm

rem_spam:
	$(WASM) $(WAT_DIR)/rem_spam.wat -o $(OBJ_DIR)/rem_spam.wasm

$(OBJ_DIR)/%.wasm: $(WAT_DIR)/%.wat
	$(WASM) -o $@ $< --enable-threads

pcd_p0: native/pcd_P0.c native/pcd_P0.S
	$(CC) -o build/pcd_P0.o $^ $(CFLAGS)

pcd_p1: native/pcd_P1.c native/pcd_P1.S
	$(CC) -o build/pcd_P1.o $^ $(CFLAGS)

pcd_p23: native/pcd_P23.c native/pcd_P23.S
	$(CC) -o build/pcd_P23.o $^ $(CFLAGS)

pcd_p5: native/pcd_P5.c native/pcd_P5.S
	$(CC) -o build/pcd_P5.o $^ $(CFLAGS)

pcd_p6: native/pcd_P6.c native/pcd_P6.S
	$(CC) -o build/pcd_P6.o $^ $(CFLAGS)

pcd: $(OBJ_FILES)  pcd_p0 pcd_p1 pcd_p23 pcd_p5 pcd_p6


covert_channel: native/covertChannel.c native/thresholdDetection.c native/denStreamDetection.c native/DenStream.c native/MicroCluster.c native/config.h native/receiver.c native/frame.c native/p1_spam.S native/frame.c native/p1_time.c native/p1_time.S native/utils.c native/sendBit.c native/sender.c native/hammingCode.c
	$(CC) -o build/covertChannel.o $^ $(CFLAGS)

clean:
	rm build/*
