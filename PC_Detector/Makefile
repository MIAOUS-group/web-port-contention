CFLAGS += -g -Wall -O0 -lm -lpthread -Wno-maybe-uninitialized
WASM = wat2wasm

WAT_DIR := ./wasm
SRC_DIR := ./native
OBJ_DIR := ./build
WAT_FILES := $(wildcard $(WAT_DIR)/*.wat)
OBJ_FILES := $(patsubst $(WAT_DIR)/%.wat,$(OBJ_DIR)/%.wasm,$(WAT_FILES))


all: pcd_p0 pcd_p1 pcd_p23 pcd_p5 pcd_p6

$(OBJ_DIR)/%.wasm: $(WAT_DIR)/%.wat
	$(WASM) -o $@ $< --enable-threads

pcd_p0: native/pcd_P0.c native/pcd_P0.S
	$(CC) -o build/pcd_P0 $^ $(CFLAGS)

pcd_p1: native/pcd_P1.c native/pcd_P1.S
	$(CC) -o build/pcd_P1 $^ $(CFLAGS)

pcd_p23: native/pcd_P23.c native/pcd_P23.S
	$(CC) -o build/pcd_P23 $^ $(CFLAGS)

pcd_p5: native/pcd_P5.c native/pcd_P5.S
	$(CC) -o build/pcd_P5 $^ $(CFLAGS)

pcd_p6: native/pcd_P6.c native/pcd_P6.S
	$(CC) -o build/pcd_P6 $^ $(CFLAGS)

pcd: $(OBJ_FILES)



clean:
	rm build/*
