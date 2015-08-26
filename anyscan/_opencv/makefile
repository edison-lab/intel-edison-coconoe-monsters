CC = g++
LIBS = -lopencv_core -lopencv_highgui -lopencv_imgproc
.PHONY: all clean app
all:app

clean:
	rm -f ./*.o
	rm -f app

app: app.o
	$(CC) -O4 $(LIBS) -o $@ $^

%.o: %.c
	$(CC) -Wall -g -c $<