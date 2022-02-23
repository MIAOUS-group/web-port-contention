CFLAGS += -g -Wall -O0 -lm -lpthread
WASM = wat2wasm


all: toy_example ctz_spam

toy_example: native/toy_example.c native/p1_spam.c native/p1_spam.S  native/p5_spam.c native/p5_spam.S
	$(CC) -o build/toy_example $^ $(CFLAGS)

ctz_spam:
	$(WASM) web/ctz_spam.wat -o build/ctz_spam.wasm --enable-threads
