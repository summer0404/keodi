import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupSessionHelper {
  buildVoteResults(votes: any[]) {
    const placeVoteMap = new Map<
      string,
      { place: any; count: number; voters: any[] }
    >();

    for (const vote of votes) {
      const placeId = vote.placeId;
      if (!placeVoteMap.has(placeId)) {
        placeVoteMap.set(placeId, {
          place: vote.place,
          count: 0,
          voters: [],
        });
      }
      const entry = placeVoteMap.get(placeId)!;
      entry.count++;
      entry.voters.push(vote.member);
    }

    return Array.from(placeVoteMap.values()).sort((a, b) => b.count - a.count);
  }
}
