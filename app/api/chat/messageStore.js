const messagesStore = {};

export const getMessageStore = (id) => {
    if (!messagesStore[id]) {
        messagesStore[id] = [];
    }

    const messageList = messagesStore[id];

    return {
        addMessage: (message) => {
            messageList.push(message);
        },
        messageList,
        getOpenAICompatibleMessageList: () => {
            return messageList.map((m) => {
                const message = {
                    ...m,
                };

                delete message.id;

                return message;
            });
        },
    };
};
