LIBSENT = ../../_libs/julius/libsent
LIBJULIUS = ../../_libs/julius/libjulius

CC = g++
CFLAGS = -O4 -std=c++0x

CPPFLAGS =-I$(LIBJULIUS)/include -I$(LIBSENT)/include  `$(LIBSENT)/libsent-config --cflags` `$(LIBJULIUS)/libjulius-config --cflags`
LDFLAGS = -L$(LIBJULIUS) `$(LIBJULIUS)/libjulius-config --libs` -L$(LIBSENT) `$(LIBSENT)/libsent-config --libs`

all:app

app: app.cpp
	$(CC) $(CFLAGS) $(CPPFLAGS) -o app app.cpp $(LDFLAGS)

clean:
	rm -f *.o *.bak *~ core TAGS
	
distclean:
	rm -f *.o *.bak *~ core TAGS
	rm -f app