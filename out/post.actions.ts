import { INewPost, IPost } from "@shared/types/entities/post.interface";
import { IProfile } from "@shared/types/entities/profile.interface";
import { IQuestion } from "@shared/types/entities/question.interface";

export const SendPostAction = "post/SendPostAction";

export interface ISendPostAction {
    type: typeof SendPostAction;
    payload: {
        newPost: INewPost;
    };
}

const sendPostFn = (newPost: INewPost): ISendPostAction => ({ type: SendPostAction, payload: {
        newPost
    } });

export const SentPostAction = "post/SentPostAction";

export interface ISentPostAction {
    type: typeof SentPostAction;
    payload: {
        post: IPost;
        profile: IProfile;
        question?: IQuestion;
        receivedAt: number;
        tmpId: string;
    };
}

const sentPostFn = (post: IPost, profile: IProfile, receivedAt: number, tmpId: string, question?: IQuestion): ISentPostAction => ({ type: SentPostAction, payload: {
        post,
        profile,
        question,
        receivedAt,
        tmpId
    } });

export type PostActionsDto = ISendPostAction | ISentPostAction;

export const PostActions = {
    send: sendPostFn,
    sent: sentPostFn
};
