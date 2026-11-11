package com.tea1.stockdspr.domain.stock.sse;

import com.tea1.stockdspr.domain.stock.dto.StockChangedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
public class StockSseEmitters {

    //연결된 화면 목록, 읽기(broadcast)가 많고 추가/삭제가 적어서 CopyOnWriteArrayList
    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    public SseEmitter add() {
        SseEmitter emitter = new SseEmitter(0L); //서버쪽 타임아웃은 없음

        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));

        // curl에서 연결 확인용 : 연결 직후 한 번 보내서 응답을 열어 두기
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            emitters.remove(emitter);
            emitter.completeWithError(e);
        }
        return emitter;
    }

    //커밋된 뒤에만 실행. 롤백되면 실행 안 됨
    @TransactionalEventListener
    public void onStockChanged(StockChangedEvent event) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("stock-changed").data(event));
            } catch (Exception e) {
                //브라우저 탭을 닫은 연결(IOException), 이미 끝난 emitter(IllegalStateException)
                emitters.remove(emitter);
            }
        }
        log.debug("stock-changed 전송 stockId={} 대상={}", event.stockId(), emitters.size());
    }
}
